"""Exercise a production frontend build with explicitly synthetic API fixtures.
This is a UI smoke test, not live-authenticated end-to-end verification.
Usage: python tests/studio/browser_smoke.py /path/to/dist /path/to/results
"""
from __future__ import annotations
import copy
import json
import os
import sys
import threading
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import parse_qs, urlsplit
from uuid import uuid4
from playwright.sync_api import sync_playwright, expect

DIST = Path(sys.argv[1]).resolve()
OUT = Path(sys.argv[2]).resolve()
OUT.mkdir(parents=True, exist_ok=True)
if not (DIST / 'index.html').is_file():
    raise SystemExit('Expected a real production build containing index.html')

class Server(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DIST), **kwargs)
    def do_GET(self):
        relative = urlsplit(self.path).path.lstrip('/')
        if relative and not (DIST / relative).is_file():
            self.path = '/index.html'
        super().do_GET()
    def log_message(self, *_):
        pass

server = ThreadingHTTPServer(('127.0.0.1', 0), Server)
threading.Thread(target=server.serve_forever, daemon=True).start()
BASE = f'http://127.0.0.1:{server.server_port}'
WORKSPACE = 'eb090e36-965f-4239-8311-9850a5fa4b31'
USER = 'a73957e1-b65d-42ee-a4eb-3408c7b2c6fa'
FOLDER = '4147e6c3-efc8-4c70-adf6-92a18ac7b45b'
NAMES = ['Atlas Studio', 'Juniper Market', 'Northstar Notes', 'Agency Project']
SITES = [dict(id=f'{i:08x}-7416-4308-8d17-5ca438d22a67', name=name,
    slug=name.lower().replace(' ', '-'), status='PUBLISHED' if i == 2 else 'DRAFT',
    workspaceId=WORKSPACE if i == 4 else None, folderId=None, archivedAt=None,
    favorite=False, revision=0, canManage=True, pageCount=i+1,
    createdAt='2026-09-25T10:00:00Z', updatedAt='2026-09-28T09:00:00Z',
    lastPublishedAt='2026-09-27T10:00:00Z' if i == 2 else None)
    for i, name in enumerate(NAMES, 1)]
state = dict(sites=copy.deepcopy(SITES), folders=[dict(id=FOLDER, name='Client work', workspaceId=None)], fail=False)
requests, results, errors = [], [], []

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH'), headless=True,
        args=['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'])
    context = browser.new_context(viewport={'width':1440, 'height':1000}, device_scale_factor=1)
    page = context.new_page()
    page.set_default_timeout(5000)
    page.on('pageerror', lambda e: errors.append(str(e)))

    def intercept(route):
        request = route.request
        parsed = urlsplit(request.url)
        path = parsed.path
        if '/api/' not in path:
            if parsed.hostname == '127.0.0.1' and parsed.port == server.server_port:
                return route.continue_()
            # This test must never reach third-party services or real user accounts.
            return route.abort()
        headers = {'Access-Control-Allow-Origin':BASE, 'Access-Control-Allow-Credentials':'true',
            'Access-Control-Allow-Headers':'Content-Type,X-Studio-Request'}
        def respond(value=None, status=200):
            return route.fulfill(status=status, content_type='application/json', headers=headers,
                body=json.dumps(value if value is not None else {'success':True}))
        if request.method == 'OPTIONS':
            return respond({}, 204)
        body = request.post_data_json if request.post_data else {}
        if request.method != 'GET':
            requests.append(dict(path=path, method=request.method, body=body,
                marker=request.headers.get('x-studio-request')))
        if path.endswith('/auth/me'):
            return respond({'success':True, 'data':{'user':{'id':USER, 'fullName':'Browser Test Account',
                'email':'test@example.test', 'role':'USER', 'status':'ACTIVE', 'emailVerified':True,
                'phoneVerified':False, 'phone':None, 'lastLoginAt':None}}})
        if path.endswith('/studio/bootstrap'):
            return respond({'success':True, 'workspaces':[{'id':WORKSPACE, 'name':'Agency workspace',
                'role':'OWNER', 'canManage':True}], 'plan':{'name':'Test', 'websiteLimit':10}})
        if path.endswith('/studio/sites') and request.method == 'GET':
            if state['fail']:
                return respond({'success':False, 'error':{'code':'STUDIO_UNAVAILABLE',
                    'message':'Synthetic service outage for error-state test'}}, 503)
            q = parse_qs(parsed.query)
            get = lambda key, default='': q.get(key, [default])[0]
            ws = None if get('workspaceId', 'personal') == 'personal' else get('workspaceId')
            view = get('view', 'all')
            sites = [s for s in state['sites'] if s['workspaceId'] == ws
                and (s['archivedAt'] is not None) == (view == 'archived')
                and get('q').casefold() in s['name'].casefold()
                and (view != 'favorites' or s['favorite'])
                and (not get('folderId') or s['folderId'] == get('folderId'))]
            return respond({'success':True, 'sites':sites,
                'folders':[f for f in state['folders'] if f['workspaceId'] == ws],
                'total':len(sites), 'page':1, 'limit':12})
        if '/studio/sites/' in path:
            siteid = path.split('/studio/sites/')[1].split('/')[0]
            site = next(s for s in state['sites'] if s['id'] == siteid)
            if path.endswith('/favorite'):
                site['favorite'] = body['favorite']
            elif request.method == 'PATCH':
                if body['revision'] != site['revision']:
                    return respond({'success':False, 'error':{'message':'Stale revision', 'code':'REVISION_CONFLICT'}}, 409)
                if 'name' in body: site['name'] = body['name']
                if 'folderId' in body: site['folderId'] = body['folderId']
                if 'archived' in body: site['archivedAt'] = '2026-09-28T10:00:00Z' if body['archived'] else None
                site['revision'] += 1
            return respond({'success':True, 'revision':site['revision']})
        if path.endswith('/studio/folders') and request.method == 'POST':
            folder = dict(id=str(uuid4()), name=body['name'],
                workspaceId=None if body['workspaceId']=='personal' else body['workspaceId'])
            state['folders'].append(folder)
            return respond({'success':True, 'folder':folder}, 201)
        if path.endswith('/studio/activity'):
            return respond({'success':True, 'events':[]})
        if path.endswith('/members'):
            return respond({'success':True, 'members':[]})
        return respond({'success':True, 'data':[]})

    context.route('**/*', intercept)
    def test(name, action):
        try:
            action()
            results.append({'name':name, 'status':'passed'})
            print('PASS', name, flush=True)
        except Exception as error:
            results.append({'name':name, 'status':'failed', 'error':str(error)})
            print('FAIL', name, str(error), flush=True)
            try: page.screenshot(path=str(OUT / f'failure-{len(results)}.png'))
            except Exception as capture_error: print('Capture error:', capture_error, flush=True)

    def initial():
        page.goto(BASE + '/dashboard')
        expect(page.locator('.fs-site')).to_have_count(3)
        expect(page.locator('.fs-brand')).to_contain_text('ForgeStudio')
        assert not errors, errors
        page.screenshot(path=str(OUT / 'dashboard-desktop.png'), full_page=True)
    test('Desktop dashboard renders production bundle with synthetic records', initial)

    def keyboard():
        page.locator('h1').click()
        page.keyboard.press('/')
        expect(page.get_by_role('textbox', name='Search sites')).to_be_focused()
    test('Slash keyboard shortcut focuses search', keyboard)

    def search():
        page.get_by_role('textbox', name='Search sites').fill('Juniper')
        expect(page.locator('.fs-site')).to_have_count(1)
        expect(page.locator('.fs-site-name')).to_have_text('Juniper Market')
        page.get_by_role('textbox', name='Search sites').fill('')
        expect(page.locator('.fs-site')).to_have_count(3)
    test('Debounced search filters and clears', search)

    def listview():
        page.get_by_role('button', name='List view', exact=True).click()
        expect(page.locator('.fs-sites-list')).to_be_visible()
        page.reload()
        expect(page.locator('.fs-sites-list')).to_be_visible()
        page.get_by_role('button', name='Grid view', exact=True).click()
    test('Grid/list preference survives reload', listview)

    def favorite():
        page.get_by_role('button', name='Favorite Atlas Studio', exact=True).click()
        expect(page.get_by_role('button', name='Unfavorite Atlas Studio', exact=True)).to_be_visible()
        page.locator('.fs-navigation').get_by_role('button', name='Favorites', exact=True).click()
        expect(page.locator('.fs-site')).to_have_count(1)
        page.locator('.fs-navigation').get_by_role('button', name='All sites', exact=True).click()
        expect(page.locator('.fs-site')).to_have_count(3)
        assert requests[-1]['marker'] == '1'
    test('Favorite mutation sends required header and updates filtered view', favorite)

    def folder():
        page.get_by_role('button', name='New folder', exact=True).click()
        expect(page.get_by_role('dialog')).to_be_visible()
        page.get_by_role('dialog').get_by_label('Name', exact=True).fill('New client folder')
        page.get_by_role('dialog').get_by_role('button', name='Save', exact=True).click()
        expect(page.get_by_role('dialog')).to_have_count(0)
        expect(page.get_by_role('button', name='New client folder', exact=True)).to_be_visible()
    test('Folder create dialog submits and refreshes persisted list', folder)

    def rename():
        page.get_by_label('Actions for Atlas Studio', exact=True).click()
        page.locator('details[open]').get_by_role('button', name='Rename', exact=True).click()
        page.get_by_role('dialog').get_by_label('Name', exact=True).fill('Atlas Renamed')
        page.get_by_role('dialog').get_by_role('button', name='Save', exact=True).click()
        expect(page.locator('.fs-site-name').filter(has_text='Atlas Renamed')).to_be_visible()
        assert requests[-1]['body']['revision'] == 0
    test('Rename includes revision and refreshes site title', rename)

    def archive():
        page.get_by_label('Actions for Juniper Market', exact=True).click()
        page.locator('details[open]').get_by_role('button', name='Archive site', exact=True).click()
        expect(page.get_by_role('dialog')).to_contain_text('This does not unpublish the live site')
        page.get_by_role('dialog').get_by_role('button', name='Confirm', exact=True).click()
        expect(page.locator('.fs-site')).to_have_count(2)
        page.locator('.fs-navigation').get_by_role('button', name='Archived sites', exact=True).click()
        expect(page.locator('.fs-site')).to_have_count(1)
        assert state['sites'][1]['status'] == 'PUBLISHED'
        page.get_by_label('Actions for Juniper Market', exact=True).click()
        page.locator('details[open]').get_by_role('button', name='Restore site', exact=True).click()
        expect(page.locator('.fs-site')).to_have_count(0)
        page.locator('.fs-navigation').get_by_role('button', name='All sites', exact=True).click()
        expect(page.locator('.fs-site')).to_have_count(3)
    test('Archive and restore work without changing live status', archive)

    def workspace():
        page.get_by_label('WORKSPACE', exact=True).select_option(WORKSPACE)
        expect(page.locator('.fs-site')).to_have_count(1)
        expect(page.locator('.fs-site-name')).to_have_text('Agency Project')
        page.get_by_label('WORKSPACE', exact=True).select_option('personal')
        expect(page.locator('.fs-site')).to_have_count(3)
    test('Workspace switch replaces records and clears prior scope', workspace)

    def cancel():
        before = len(requests)
        page.get_by_role('button', name='New site', exact=True).click()
        expect(page.get_by_role('dialog')).to_be_visible()
        page.keyboard.press('Escape')
        expect(page.get_by_role('dialog')).to_have_count(0)
        assert len(requests) == before
    test('Native dialog Escape cancellation performs no write', cancel)

    def mobile():
        page.set_viewport_size({'width':390, 'height':844})
        assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), 'Horizontal page overflow'
        page.get_by_role('button', name='Open navigation', exact=True).click()
        expect(page.locator('.fs-sidebar-open')).to_be_visible()
        page.get_by_role('button', name='Close navigation', exact=True).click(position={'x':350, 'y':100})
        page.screenshot(path=str(OUT / 'dashboard-mobile.png'), full_page=True)
        page.set_viewport_size({'width':1440, 'height':1000})
    test('Mobile layout has no horizontal overflow and drawer operates', mobile)

    def outage():
        state['fail'] = True
        page.get_by_role('button', name='Refresh sites', exact=True).click()
        expect(page.locator('.fs-banner').filter(has_text='Synthetic service outage')).to_be_visible()
        expect(page.locator('.fs-site')).to_have_count(0)
        state['fail'] = False
        page.locator('.fs-banner').get_by_role('button', name='Retry', exact=True).click()
        expect(page.locator('.fs-site')).to_have_count(3)
    test('API error is visible and Retry restores records without stale success', outage)

    def no_errors():
        assert not errors, errors
    test('No uncaught JavaScript errors in exercised dashboard flows', no_errors)
    browser.close()
server.shutdown()
report = {'scope':'Production frontend bundle with synthetic/intercepted API fixtures; not live-authenticated end-to-end verification',
    'results':results, 'passed':sum(x['status']=='passed' for x in results),
    'failed':sum(x['status']=='failed' for x in results), 'javascriptErrors':errors, 'mutations':requests}
(OUT / 'browser-smoke-results.json').write_text(json.dumps(report, indent=2))
print(json.dumps(report, indent=2))
raise SystemExit(1 if report['failed'] else 0)
