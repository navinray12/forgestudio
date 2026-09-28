"""Real new-module HTTP/session/PostgreSQL flows. No intercepted API success responses.
Requires the test-only TypeScript host. Never logs or uploads its session metadata.
"""
import json
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
meta = json.loads(Path(sys.argv[1]).read_text())
out = Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
results, errors = [], []
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width":1440,"height":1000})
    context.add_cookies([{"name":"forge_session","value":meta['ownerToken'],"url":meta['base'],"httpOnly":True,"sameSite":"Lax"}])
    page = context.new_page(); page.set_default_timeout(10000)
    page.on('pageerror', lambda error: errors.append(str(error)))
    def run(name, fn):
        try:
            fn(); results.append({'name':name,'status':'passed'}); print('PASS',name,flush=True)
        except Exception as error:
            results.append({'name':name,'status':'failed','error':str(error)}); print('FAIL',name,str(error),flush=True)
            page.screenshot(path=str(out/f'failure-{len(results)}.png'),full_page=True)
    def ready():
        page.goto(f"{meta['base']}/studio/{meta['siteId']}")
        expect(page.get_by_role('heading',name='Integration site',exact=True)).to_be_visible()
        expect(page.get_by_role('heading',name='CMS collections',exact=True)).to_be_visible()
    run('Session-authenticated Site Studio renders the production frontend',ready)
    def schema():
        page.get_by_role('button',name='New collection',exact=True).click()
        d=page.get_by_role('dialog'); d.get_by_label('Name',exact=True).fill('Stories')
        d.get_by_role('button',name='Add field',exact=True).click()
        d.get_by_label('Label',exact=True).fill('Body'); d.get_by_label('Key',exact=True).fill('body')
        d.get_by_label('Type',exact=True).select_option('RICH_TEXT')
        d.get_by_label('Required when publishing',exact=True).check()
        d.get_by_role('button',name='Save collection',exact=True).click()
        expect(page.get_by_role('dialog')).to_have_count(0)
        expect(page.get_by_role('button',name='New item',exact=True)).to_be_visible()
    run('Create a typed rich-text collection through the real API',schema)
    def draft():
        page.get_by_role('button',name='New item',exact=True).click()
        d=page.get_by_role('dialog'); d.get_by_label('Name',exact=True).fill('First story')
        d.get_by_label('Body',exact=False).fill('<p>Published version</p><img src=x onerror="window.pwned=true"><script>window.pwned=true</script>')
        d.get_by_role('button',name='Save draft',exact=True).click()
        expect(page.get_by_role('dialog')).to_have_count(0)
        expect(page.get_by_role('button',name='First story',exact=True)).to_be_visible()
        public=page.request.get(f"{meta['base']}/api/v1/studio-next/public/sites/{meta['siteId']}/collections/stories").json()
        assert public['items']==[], 'A draft leaked into public API'
    run('Save a draft and confirm it is absent from public reads',draft)
    def publish():
        page.get_by_role('button',name='Publish',exact=True).click()
        expect(page.locator('td .sn-badge').filter(has_text='Published')).to_be_visible()
        page.screenshot(path=str(out/'site-studio-desktop.png'),full_page=True)
        preview=context.new_page(); preview.goto(f"{meta['base']}/content/{meta['siteId']}/stories")
        expect(preview.get_by_text('Published version',exact=True)).to_be_visible()
        assert preview.evaluate('window.pwned === undefined')
        assert preview.locator('.sn-rich-text script').count()==0
        preview.close()
    run('Publish content and verify sanitized public HTML from real persisted data',publish)
    def draft_edit():
        page.get_by_role('button',name='First story',exact=True).click()
        d=page.get_by_role('dialog'); d.get_by_label('Body',exact=False).fill('<p>Draft-only edit</p>')
        d.get_by_role('button',name='Save draft',exact=True).click();expect(page.get_by_role('dialog')).to_have_count(0)
        expect(page.locator('.sn-badge').filter(has_text='Published · draft changes')).to_be_visible()
        public=page.request.get(f"{meta['base']}/api/v1/studio-next/public/sites/{meta['siteId']}/collections/stories").json()
        assert 'Published version' in public['items'][0]['fields']['body'] and 'Draft-only edit' not in public['items'][0]['fields']['body']
        page.reload();expect(page.get_by_role('button',name='First story',exact=True)).to_be_visible()
    run('Editing published content preserves the live snapshot across reload',draft_edit)
    def review():
        page.get_by_role('button',name='Reviews',exact=True).click()
        page.get_by_label('New review comment',exact=True).fill('Please check the heading')
        page.get_by_role('button',name='Post comment',exact=True).click()
        expect(page.get_by_text('Please check the heading',exact=True)).to_be_visible()
        page.get_by_label('Reply',exact=True).fill('Reviewed in browser')
        page.get_by_role('button',name='Reply',exact=True).click()
        expect(page.get_by_text('Reviewed in browser',exact=True)).to_be_visible()
        page.get_by_role('button',name='Resolve thread',exact=True).click()
        expect(page.locator('.sn-thread .sn-badge')).to_have_text('Resolved')
    run('Post, reply to, and resolve a database-backed review thread',review)
    def snapshots():
        page.get_by_role('button',name='Snapshots',exact=True).click()
        page.get_by_label('Snapshot name',exact=True).fill('Browser checkpoint')
        page.get_by_role('button',name='Capture snapshot',exact=True).click()
        expect(page.get_by_text('Browser checkpoint',exact=True)).to_be_visible()
        page.once('dialog',lambda dialog:dialog.accept())
        page.get_by_role('button',name='Restore draft',exact=True).click()
        expect(page.get_by_text('Before restore',exact=True)).to_be_visible()
    run('Capture and restore a saved design through the real backend',snapshots)
    def locale():
        page.get_by_role('button',name='Localization',exact=True).click()
        page.get_by_role('button',name='Add locale',exact=True).click()
        d=page.get_by_role('dialog');d.get_by_label('Language name',exact=True).fill('French');d.get_by_label('Canonical language tag',exact=True).fill('fr')
        d.get_by_role('button',name='Create locale',exact=True).click();expect(page.get_by_role('dialog')).to_have_count(0)
        page.get_by_label('Publicly enabled',exact=True).check()
        page.get_by_role('button',name='Translate',exact=True).click()
        d=page.get_by_role('dialog'); d.get_by_label('Localized page title',exact=True).fill('Bonjour')
        d.get_by_label('Translated text',exact=True).fill('Bonjour le monde')
        d.get_by_role('button',name='Save translation draft',exact=True).click(); expect(page.get_by_role('dialog')).to_have_count(0)
        page.get_by_role('button',name='Publish translation',exact=True).click()
        expect(page.get_by_text('Translation published',exact=True)).to_be_visible()
        payload=page.request.get(f"{meta['base']}/api/v1/studio-next/public/sites/{meta['siteId']}/localization?locale=fr").json()
        assert payload['pages']['home']['texts']['heading']=='Bonjour le monde'
    run('Create, enable, edit and publish a locale through the UI and database',locale)
    def invitations():
        other=browser.new_context(viewport={"width":1280,"height":800})
        other.add_cookies([{"name":"forge_session","value":meta['inviteeToken'],"url":meta['base'],"httpOnly":True,"sameSite":"Lax"}])
        q=other.new_page();q.goto(meta['base']+'/invitations')
        expect(q.get_by_role('button',name='Accept invitation',exact=True)).to_be_visible()
        q.get_by_role('button',name='Accept invitation',exact=True).click()
        expect(q.get_by_text('Workspace invitation accepted',exact=True)).to_be_visible()
        expect(q.get_by_role('button',name='Accept invitation',exact=True)).to_have_count(0)
        other.close()
    run('A second verified account accepts its own workspace invitation',invitations)
    def ai_site_generation():
        page.goto(f"{meta['base']}/studio/{meta['aiSiteId']}?panel=ai")
        expect(page.get_by_role('heading',name='Reviewable AI website generation',exact=True)).to_be_visible()
        page.get_by_role('button',name='Generate site',exact=True).click()
        page.get_by_label('Instruction',exact=True).fill('Create a professional accounting SaaS website')
        page.get_by_role('button',name='Plan and generate site',exact=True).click()
        expect(page.get_by_role('heading',name='Browser Accounting',exact=True)).to_be_visible()
        expect(page.get_by_text('Home, Features, Contact',exact=False)).to_be_visible()
        before=page.request.get(f"{meta['base']}/api/v1/studio-next/sites/{meta['aiSiteId']}/design").json()
        assert before['website']['editorData']['pages']==[], 'AI proposal mutated the design before approval'
        page.get_by_role('button',name='Apply reviewed change',exact=True).click()
        expect(page.get_by_text('AI change applied',exact=True)).to_be_visible()
        current=page.request.get(f"{meta['base']}/api/v1/studio-next/sites/{meta['aiSiteId']}/design").json()
        assert len(current['website']['editorData']['pages'])==3
        assert current['website']['editorData']['homePageId']=='browser-home'
        assert current['website']['editorData']['globalVariables'][0]['id']=='browser-primary'
        edit=page.request.post(f"{meta['base']}/api/v1/studio-next/sites/{meta['aiSiteId']}/design/commands",headers={'Origin':meta['base'],'X-Studio-Request':'1','Content-Type':'application/json'},data=json.dumps({'baseHash':current['hash'],'operationId':'11111111-1111-4111-8111-111111111111','commands':[{'type':'SET_ELEMENT_TEXT','elementId':'browser-home-title','field':'content','value':'Edited manually after AI'}]}))
        assert edit.status==200, edit.text()
        after=page.request.get(f"{meta['base']}/api/v1/studio-next/sites/{meta['aiSiteId']}/design").json()
        assert after['website']['editorData']['pages'][0]['elements'][0]['content']=='Edited manually after AI'
        page.goto(f"{meta['base']}/studio/{meta['siteId']}")
        expect(page.get_by_role('heading',name='Integration site',exact=True)).to_be_visible()
    run('AI plans and builds an editable multi-page site through the real UI and backend',ai_site_generation)
    def mobile():
        page.get_by_role('button',name='Collections',exact=True).click()
        page.set_viewport_size({'width':390,'height':844})
        expect(page.get_by_role('heading',name='CMS collections',exact=True)).to_be_visible()
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Horizontal document overflow'
        page.screenshot(path=str(out/'site-studio-mobile.png'),full_page=True)
        page.set_viewport_size({'width':1440,'height':1000})
    run('Mobile Site Studio layout does not overflow the viewport',mobile)
    def guards():
        anonymous=browser.new_context();q=anonymous.new_page();q.goto(f"{meta['base']}/studio/{meta['siteId']}")
        expect(q).to_have_url(meta['base']+'/login');anonymous.close()
        reviewer=browser.new_context();reviewer.add_cookies([{'name':'forge_session','value':meta['reviewerToken'],'url':meta['base']}]);q=reviewer.new_page();q.goto(f"{meta['base']}/studio/{meta['siteId']}")
        expect(q.get_by_role('heading',name='CMS collections',exact=True)).to_be_visible()
        expect(q.get_by_role('button',name='New collection',exact=True)).to_have_count(0)
        expect(q.get_by_role('button',name='New item',exact=True)).to_have_count(0)
        reviewer.close()
    run('Anonymous and reviewer views respect authentication and write permissions',guards)
    run('No uncaught JavaScript errors in tested Site Studio flows',lambda: (_ for _ in ()).throw(AssertionError(errors)) if errors else None)
    browser.close()
report={'scope':'Production frontend with real new-module HTTP routes, real PostgreSQL sessions/persistence, synthetic accounts. No Google OAuth, live Stripe payment, DNS provider, or production deployment is tested.','passed':sum(x['status']=='passed' for x in results),'failed':sum(x['status']=='failed' for x in results),'javascriptErrors':errors,'results':results}
(out/'site-studio-e2e.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2))
raise SystemExit(1 if report['failed'] else 0)
