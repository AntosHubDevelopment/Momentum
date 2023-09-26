import { Request } from "express";
import { iUser } from "../model/user";
import functions from "./structs/functions.js";
import destr from 'destr';
import { iParty } from "../types/typings";

const parties = new Map();

class Parties {

    public invites = new Map();

    public pings: {
        sent_by: string;
        sent_to: string;
        sent_at: string;
        meta: {
            [key: string]: any;
        },
        expires_at: string;
    }[] = [];

    public createParty(user: iUser, req: Request) {
        const partyId = (functions.MakeID()).replaceAll("-", "").toLowerCase();
        parties.set(partyId, {
            invites: [],
            applicants: [],
            revision: 0,
            intentions: [],
            id: partyId,
            "created_at": new Date().toISOString(),
            "updated_at": new Date().toISOString(),

            "config": {
                ...req.body.config,
                "intention_ttl": 60,
                "invite_ttl": 14400,
                "sub_type": "default",
                "type": "DEFAULT"

            },
            "members": [
                {
                    "account_id": user.accountId,
                    connections: [
                        {
                            conneted_at: new Date().toISOString(),
                            id: req.body.join_info.connection.id,
                            meta: {
                                ...req.body.join_info.connection.meta
                            },
                            updated_at: new Date().toISOString(),
                            yield_leadership: false
                        }
                    ],
                    joined_at: new Date().toISOString(),
                    meta: {
                        ...req.body.join_info.meta
                    },
                    role: "CAPTAIN",
                    updated_at: new Date().toISOString(),
                    revision: 0
                },
            ],
            "meta": {
                ...req.body.meta,
            }


        })

        return destr<iParty>(parties.get(partyId));
    }

    public getParty(partyId: string) {
        
        const party = destr<iParty>(parties.get(partyId));
        if (!party) return undefined;
        return party;

    }

    public saveParty(partyId: string, party: any) {
        parties.set(partyId, party);
    }

    public findPartyByMember(accountId: string) {
        const party = destr<iParty>(Array.from(parties.values()).find(party => party.members.find(member => member.account_id === accountId)));
        if (!party) return undefined;
        return party;
    }

    public removePartyMember(partyId: string, toKick: string, from: string) {
        const party = destr<iParty>(parties.get(partyId));
        if (!party) return undefined;
        const member = party.members.find(member => member.account_id === toKick);
        
        if (!member) return undefined;

        const wasKicked = from !== toKick;

        const xmppMessage = {
            account_id: toKick,
            member_state_update: {},
            ns: "Fortnite",
            party_id: partyId,
            revision: party.revision || 0,
            sent: new Date().toISOString(),
            type: wasKicked ? "com.epicgames.social.party.notification.v0.MEMBER_KICKED" : "com.epicgames.social.party.notification.v0.MEMBER_LEFT"
        }

        party.members.filter(member => member.account_id !== toKick)

        for (let member of party.members) {
            functions.sendXmppMessageToId(xmppMessage, member.account_id);
        }
        
        if (party.members.length === 0) {
            parties.delete(partyId);
            return null;
        }
        parties.set(partyId, party);

        return party;
    }

    public addPartyMember(partyId: string, connection: any, accountId: string, meta: any) {
        const party = destr<iParty>(parties.get(partyId));
        if (!party) return undefined;
        party.members.push({
            account_id: accountId,
            meta: {
                ...meta
            },
            connections: [
                {
                    connected_at: new Date().toISOString(),
                    id: connection.id,
                    meta: {
                        ...connection.meta
                    },
                    updated_at: new Date().toISOString(),
                    yield_leadership: false
                }
            ],
            joined_at: new Date().toISOString(),
            role: "MEMBER",
            updated_at: new Date().toISOString(),
            revision: 0
        });
        parties.set(partyId, party);

        party.members.forEach(member => {
            if (member.account_id === accountId) return;
            functions.sendXmppMessageToId({
                account_dn: connection.meta["urn:epic:member:dn_s"],
                account_id: connection.id.split("@")[0],
                connection: {
                    connected_at: new Date(),
                    id: connection.id,
                    meta: connection.meta,
                    updated_at: new Date(),
                    yield_leadership: false
                },
                joined_at: new Date(),
                member_state_updated: meta,
                ns: "Fortnite",
                party_id: party.id,
                revision: party.members.find(x => x.account_id == connection.id.split("@")[0])!.revision || 0,
                sent: new Date(),
                type: "com.epicgames.social.party.notification.v0.MEMBER_JOINED",
                updated_at: new Date()
            }, member.account_id)
        })
    }

    public deleteParty(partyId: string) {
        parties.delete(partyId);
    }

    public setPartyLeader(partyId: string, accountId: string) {
        const party = destr<iParty>(parties.get(partyId));
        if (!party) return undefined;
        const member = party.members.find(member => member.account_id === accountId);
        if (!member) return undefined;
        const captain = party.members.find(member => member.role === "CAPTAIN")!;
        member.role = "CAPTAIN";
        captain.role = "MEMBER";
        parties.set(partyId, party);
        const xmppMessage = {
            account_id: accountId,
            member_state_update: {},
            ns: "Fortnite",
            party_id: partyId,
            revision: party.revision || 0,
            sent: new Date().toISOString(),
            type: "com.epicgames.social.party.notification.v0.MEMBER_NEW_CAPTAIN"
        }

        for (let member of party.members) {
            functions.sendXmppMessageToId(xmppMessage, member.account_id);
        }

        return party;
    }

    public reconnectUser(partyId: string, accountId: string, connection: any, meta: any) {
        const party = destr<iParty>(parties.get(partyId));

        if (!party) return undefined;

        const member = party.members.find(member => member.account_id === accountId);

        if (!member) return undefined;
    
        member.connections = [
            connection
        ]

        
    }

}

export default new Parties();
