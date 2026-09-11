import type { CardID } from "./card";
import type { PlayerID } from "./player";

export interface NeighDiscussion {
    protagonist: PlayerID;
    cardID: CardID;
    rounds: NeighRound[];
    target: PlayerID;
    /** Host-armed countdown for the CURRENT round only - cleared whenever a new
     *  round starts (a Neigh was played), since the set of undecided voters changes. */
    voteTimeoutStartedAt?: number;
    voteTimeoutDurationSec?: number;
}

type NeighRound = {
    state: "open" | "neigh" | "no_neigh";
    playerState: {[key: string]: {
        vote: "undecided" | "neigh" | "no_neigh";
    }};
}