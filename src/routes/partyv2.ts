import express from 'express'
import Parties from '../utilities/party.js'
import error from '../utilities/structs/error.js';
import { verifyClient } from '../tokenManager/tokenVerify.js';
import functions from '../utilities/structs/functions.js';
import Friends from '../model/friends.js'
const app = express.Router()

app.post("/party/api/v1/Fortnite/parties", verifyClient, (req, res) => {

    if (Parties.findPartyByMember(req.user.accountId)) {
        return error.createError(
            "errors.com.epicgames.social.party.user_has_party",
            `User [${req.user.accountId}] already has a party in namespace [Fortnite] with subtype [default]`,
            [], 51012, "user_has_party", 409, res
        )
    }

    const party = Parties.createParty(req.user, req);
    res.json(party);
});

app.patch("/party/api/v1/Fortnite/parties/:partyId", verifyClient, (req, res) => {

    const party = Parties.getParty(req.params.partyId);

    if (!party) {
        return error.createError(
            "errors.com.epicgames.social.party.party_not_found",
            `Sorry, we couldn't find a party with the id: ${req.params.partyId}`,
            [], 1004, "party_not_found", 404, res
        );
    }

    for (let [key, value] of Object.entries(req.body.config)) {
        party.config[key] = value;
    }

    for (let [key, value] of Object.entries(req.body.meta.delete)) {
        delete party.meta[key];
    }

    for (let [key, value] of Object.entries(req.body.meta.update)) {
        party.meta[key] = value;
    }

    party.updated_at = new Date().toISOString();
    party.revision++;


    for (let member of party.members) {

        functions.sendXmppMessageToId({
            captain_id: party.members.find(member => member.role === "CAPTAIN")!.account_id,
            created_at: party.created_at,
            invite_ttl_seconds: party.config.invite_ttl,
            max_number_of_members: party.config.max_size,
            ns: "Fortnite",
            party_id: party.id,
            party_privacy_type: party.config.joinability,
            party_state_overriden: {},
            party_state_removed: req.body.meta.delete,
            party_state_updated: req.body.meta.update,
            party_sub_type: party.config.sub_type,
            party_type: party.config.type,
            updated_at: party.updated_at,
            revision: party.revision,
            sent: new Date(),
            type: "com.epicgames.social.party.notification.v0.PARTY_UPDATED",
        }, member.account_id)
    }

    Parties.saveParty(party.id, party);

    res.json(party);
})



app.patch("/party/api/v1/Fortnite/parties/:partyId/members/:accountId/meta", verifyClient, (req, res) => {

    const party = Parties.getParty(req.params.partyId);

    if (!party) {
        return error.createError(
            "errors.com.epicgames.social.party.party_not_found",
            `Sorry, we couldn't find a party with the id: ${req.params.partyId}`,
            [], 1004, "party_not_found", 404, res
        );
    }

    const member = party.members.find(member => member.account_id === req.params.accountId);

    if (!member) {
        return error.createError(
            "errors.com.epicgames.social.party.member_not_found",
            `Sorry, we couldn't find a member with the id: ${req.params.accountId}`,
            [], 1004, "member_not_found", 404, res
        );
    }

    for (let [key, value] of Object.entries(req.body.meta.delete)) {
        delete member.meta[key];
    }

    for (let [key, value] of Object.entries(req.body.meta.update)) {
        member.meta[key] = value;
    }

    member.updated_at = new Date().toISOString();
    member.revision++;

    Parties.saveParty(party.id, party);

    res.status(204).end();

})

app.post("/party/api/v1/Fortnite/parties/:partyId/pings/:accountId", verifyClient, (req, res) => { 

    const party = Parties.getParty(req.params.partyId);

    if (!party) {
        return error.createError(
            "errors.com.epicgames.social.party.party_not_found",
            `Sorry, we couldn't find a party with the id: ${req.params.partyId}`,
            [], 1004, "party_not_found", 404, res
        );
    }

    const member = party.members.find(member => member.account_id === req.user.accountId);

    if (!member) {
        return error.createError(
            "errors.com.epicgames.social.party.member_not_found",
            `Sorry, we couldn't find a member with the id: ${req.user.accountId}`,
            [], 1004, "member_not_found", 404, res
        );
    }



    const invite = {
        sent: new Date().toISOString(),
        type: "com.epicgames.social.party.notification.v0.PING",
        "ns": "Fortnite",
        pinger_id: req.user.accountId,
        pinger_dn: req.user.username,
        // add 45 minutes to current time
        expires: new Date(Date.now() + 45 * 60000).toISOString(),
        meta: {
            "urn:epic:invite:platformdata_s": "",
        }
    }

    functions.sendXmppMessageToId(invite, req.params.accountId);


    res.json({
        expires_at: invite.expires,
        sent_by: req.user.accountId,
        sent_to: req.params.accountId,
        meta: {
            ...req.body.meta
        }
    })
})

app.post("/party/api/v1/Fortnite/parties/:partyId/pings/:accountId/join", verifyClient, (req, res) => { 

    const party = Parties.getParty(req.params.partyId);

    if (!party) {
        return error.createError(
            "errors.com.epicgames.social.party.party_not_found",
            `Sorry, we couldn't find a party with the id: ${req.params.partyId}`,
            [], 1004, "party_not_found", 404, res
        );
    }

    party.members.push({
        account_id: req.params.accountId,
        connections: [
            {
                conneted_at: new Date().toISOString(),
                id: req.body.connection.id,
                meta: req.body.connection.meta,
                yield_leadership: false,
                updated_at: new Date().toISOString(),
            }
        ],
        joined_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        role: "MEMBER",
        meta: req.body.meta,
        revision: 0
    })

    functions.sendXmppMessageToId({
        account_dn: req.body.meta["urn:epic:member:dn_s"],
        account_id: req.params.accountId,
        connection: {
            connected_at: new Date().toISOString(),
            id: req.body.connection.id,
            meta: req.body.connection.meta,
            updated_at: new Date().toISOString(),
        },
        joined_at: new Date().toISOString(),
        member_state_updated: req.body.meta,
        party_id: party.id,
        revision: party.revision,
        sent: new Date().toISOString(),
        type: "com.epicgames.social.party.notification.v0.MEMBER_JOINED",
    }, req.user.accountId)

    res.status(204).end();
})

app.delete("/party/api/v1/Fortnite/parties/:partyId/members/:userId", verifyClient, (req, res) => {
    // undefined = party not found, null = party deleted/doesn't have any more members
    const party = Parties.removePartyMember(req.params.partyId, req.params.userId);

    if (!party === undefined) {
        return error.createError(
            "errors.com.epicgames.social.party.party_not_found",
            `Sorry, we couldn't find a party with the id: ${req.params.partyId}`,
            [], 1004, "party_not_found", 404, res
        );
    }

    // if party doesn't have any more members
    if (party === null) {
        return res.status(204).end();
    }

    res.json(party);
})

// probably not correct
app.get("/party/api/v1/Fortnite/user/:accountId/pings/:userId", verifyClient, (req, res) => {

    const party = Parties.findPartyByMember(req.params.accountId);

    if (!party) {
        return error.createError(
            "errors.com.epicgames.social.party.party_not_found",
            `IDK lmao`,
            [], 1004, "party_not_found", 404, res
        );
    }

    res.json(party);
})

/*app.get("/party/api/v1/Fortnite/user/:accountId", verifyClient, (req, res) => {

    // find all invites/pings for user
    const invites = Parties.findInvitesByMember(req.params.accountId);


})*/

// Request to join - initial invite send (????)
app.post("/party/api/v1/Fortnite/parties/:partyId/invites/:accountId", verifyClient, async (req, res) => {

    const friendlist = await Friends.findOne({ accountId: req.user.accountId })

    // check the party members and see if they're friends of the user
    const party = Parties.getParty(req.params.partyId);

    if (!party) {
        return error.createError(
            "errors.com.epicgames.social.party.party_not_found",
            `Sorry, we couldn't find a party with the id: ${req.params.partyId}`,
            [], 1004, "party_not_found", 404, res
        );
    }

    const members = friendlist?.list.filter(friend => party.members.find(member => member.account_id === friend.accountId)?.account_id);


    if (req.query.sendPing) {
        const xmppPing = {
            sent: new Date().toISOString(),
            type: "com.epicgames.social.party.notification.v0.INITIAL_INVITE",
            meta: {
                ...req.body
            },
            ns: "Fortnite",
            party_id: req.params.partyId,
            inviter_id: req.user.accountId,
            inviter_dn: req.user.username,
            invitee_id: req.params.accountId,
            sent_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            friends_ids: members,
            members_count: party.members.length
        }

        functions.sendXmppMessageToId(xmppPing, req.params.accountId);
    }

    res.status(204).send();
})

// Request to join - confirm
app.post("/party/api/v1/Fortnite/parties/:partyId/members/:accountId/confirm", verifyClient, (req, res) => { 
    

})

// Request to join - Initial intention (first thing that happens when you click the button)
app.post("/party/api/v1/Fortnite/members/:toSendAccId/intentions/:accountId", verifyClient, (req, res) => {

    const onlineUser = global.Clients.find(client => client.accountId === req.params.toSendAccId)

    if (!onlineUser) {
        return error.createError(
            "errors.com.epicgames.social.party.user_is_offline",
            `Operation is forbidden because the user ${req.params.toSendAccId} is offline.`,
            [], 51024, "user_is_offline", 403, res
        )
    }

    const xmppIntention = {
        sent: new Date().toISOString(),
        type: "com.epicgames.social.party.notification.v0.INITIAL_INTENTION",
        "ns": "Fortnite",
        "requester_id": req.params.toSendAccId,
        "requester_dn": onlineUser.username,
        requestee_id: req.params.accountId,
        sent_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 1 * 60000).toISOString(),
        meta: {
            "urn:epic:invite:platformdata_s": "RequestToJoin"
        }
    }

    Parties.invites.set(req.params.accountId, xmppIntention);

    functions.sendXmppMessageToId(xmppIntention, req.params.accountId);

    res.json({
        expires_at: xmppIntention.expires_at,
        meta: {
            ...req.body.meta
        },
        requester_dn: req.user.username,
        requester_id: req.user.accountId,
        requestee_id: req.params.toSendAccId,
        sent_at: xmppIntention.sent_at,
        requester_pl: "",
        requester_pl_dn: ""
    })
})
 



export default app;