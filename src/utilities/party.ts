import { Request } from "express";
import { iUser } from "../model/user";
import functions from "./structs/functions.js";

const parties = new Map();

class Parties {

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
                    updated_at: new Date().toISOString()
                },
            ],
            "meta": {
                ...req.body.meta,
            }


        })

        return parties.get(partyId);
    }

}

interface iParty {
    "urn:epic:cfg:party-type-id_s": string
    "Default:PartyState_s": string,
    "urn:epic:cfg:build-id_s": string,
}