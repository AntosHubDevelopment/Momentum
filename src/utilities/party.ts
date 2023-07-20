import { Request } from "express";
import { iUser } from "../model/user";
import functions from "./structs/functions.js";
import destr from 'destr';
import { iParty } from "../types/typings";

const parties = new Map();

class Parties {

    public invites = new Map();

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
                                "urn:epic:conn:platform": req.body.join_info.connection.meta["urn:epic:conn:platform"],
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

    public removePartyMember(partyId: string, accountId: string) {
        const party = destr<iParty>(parties.get(partyId));
        if (!party) return undefined;
        party.members = party.members.filter(member => member.account_id !== accountId);
        
        if (party.members.length === 0) {
            parties.delete(partyId);
            return null;
        }
        parties.set(partyId, party);

        // TODO: xmpp

        return party;
    }


}

export default new Parties();
