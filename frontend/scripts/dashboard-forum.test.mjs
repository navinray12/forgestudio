import test from 'node:test';
import assert from 'node:assert/strict';
import {forumQuery,forumDate,forumFilters} from '../src/features/forum/forum-api.ts';
test('forum filters and paging produce independent backend query parameters',()=>{
 assert.deepEqual(forumFilters,['latest','popular','unanswered','solved']);
 assert.equal(forumQuery('latest','',1),'filter=latest&page=1');
 const query=new URLSearchParams(forumQuery('unanswered','a&b',3));assert.equal(query.get('categoryId'),'a&b');assert.equal(query.get('page'),'3');assert.equal(query.get('filter'),'unanswered');assert.equal(query.size,3);
});
test('discussion dates use persisted timestamps',()=>{assert.ok(forumDate('2026-10-28T12:00:00Z').includes('2026'));});
