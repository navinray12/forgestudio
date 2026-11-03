import test from "node:test";
import assert from "node:assert/strict";
import { invitationEmail, invitationToken, invitationTokenHash, matchesInvitationToken, invitationLink } from "../services/workspace-invitation-token.js";
import { assertInvitationSmtpConfigured } from "../services/email.service.js";
test("Invitation proofs are normalized, versioned, hashed and configuration fails closed", () => {
  const names=["WORKSPACE_INVITATION_TOKEN_KEY","FRONTEND_URL","NODE_ENV","SMTP_HOST"] as const;
  const previous=Object.fromEntries(names.map(name=>[name,process.env[name]]));
  try {
    delete process.env.WORKSPACE_INVITATION_TOKEN_KEY;
    assert.throws(()=>invitationToken("id",1),/not configured/);
    process.env.WORKSPACE_INVITATION_TOKEN_KEY="ab".repeat(32);process.env.FRONTEND_URL="https://forge.example";
    const token=invitationToken("id",1);assert.match(token,/^[\w-]{43}$/);
    assert.notEqual(token,invitationToken("id",2));
    assert.ok(matchesInvitationToken(token,invitationTokenHash(token)));
    assert.equal(matchesInvitationToken("invalid",invitationTokenHash(token)),false);
    const link=new URL(invitationLink("id",token));assert.equal(link.search,"");assert.equal(link.hash,`#token=${token}`);
    assert.equal(invitationEmail(" User@Example.com "),"user@example.com");assert.throws(()=>invitationEmail("bad"));
    process.env.FRONTEND_URL="https://forge.example/?redirect=evil";assert.throws(()=>invitationLink("id",token));
    process.env.NODE_ENV="production";process.env.FRONTEND_URL="http://localhost:5173";assert.throws(()=>invitationLink("id",token));
    delete process.env.SMTP_HOST;assert.throws(()=>assertInvitationSmtpConfigured(),/Configure SMTP/);
  } finally {for(const name of names){if(previous[name]===undefined)delete process.env[name];else process.env[name]=previous[name];}}
});
