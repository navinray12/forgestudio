import test from "node:test";
import assert from "node:assert/strict";
import net from "node:net";
import { sendWorkspaceInvitationMessage } from "../services/email.service.js";
test("Invitation email uses the configured SMTP transport and carries the acceptance link", async () => {
  const names=["SMTP_HOST","SMTP_PORT","SMTP_USER","SMTP_PASSWORD","SMTP_FROM"] as const;
  const previous=Object.fromEntries(names.map(name=>[name,process.env[name]]));
  let delivered="";
  const server=net.createServer(socket=>{
    socket.setEncoding("utf8");socket.write("220 test-smtp.local ESMTP\r\n");
    let buffer="", data=false;
    socket.on("data",chunk=>{
      buffer+=chunk;
      while(buffer.includes("\r\n")){
        const pos=buffer.indexOf("\r\n"), line=buffer.slice(0,pos);buffer=buffer.slice(pos+2);
        if(data){if(line==="."){data=false;socket.write("250 message accepted\r\n");}else delivered+=line+"\n";continue;}
        if(line.startsWith("EHLO"))socket.write("250-test-smtp.local\r\n250 AUTH PLAIN\r\n");
        else if(line.startsWith("AUTH PLAIN"))socket.write("235 authenticated\r\n");
        else if(line.startsWith("MAIL FROM")||line.startsWith("RCPT TO"))socket.write("250 OK\r\n");
        else if(line==="DATA"){data=true;socket.write("354 end with dot\r\n");}
        else if(line==="QUIT")socket.end("221 bye\r\n");
        else socket.write("250 OK\r\n");
      }
    });
  });
  server.listen(0,"127.0.0.1");await new Promise<void>(resolve=>server.once("listening",resolve));
  try {
    process.env.SMTP_HOST="127.0.0.1";process.env.SMTP_PORT=String((server.address() as net.AddressInfo).port);
    process.env.SMTP_USER="test-user";process.env.SMTP_PASSWORD="test-only-password";process.env.SMTP_FROM="Forge <forge@example.com>";
    await sendWorkspaceInvitationMessage({to:"recipient@example.com",subject:"Workspace invitation",text:"Accept: https://forge.example/workspace-invitations/test#token=test-proof",messageId:"<invitation.test@forge.example>"});
    assert.match(delivered,/To: recipient@example.com/);assert.match(delivered,/Subject: Workspace invitation/);
    assert.match(delivered,/workspace-invitations/);assert.match(delivered,/#token=test-proof/);
    assert.match(delivered,/Message-ID: <invitation.test@forge.example>/i);
  } finally {
    await new Promise<void>(resolve=>server.close(()=>resolve()));
    for(const name of names){if(previous[name]===undefined)delete process.env[name];else process.env[name]=previous[name];}
  }
});
