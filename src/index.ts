import {
    BohemiaInteractiveId,
    CFToolsClient,
    CFToolsId,
    GenericId,
    GetLeaderboardRequest,
    LeaderboardItem,
    LoginCredentials,
    Player,
    PriorityQueueItem,
    PutPriorityQueueItemRequest,
    ServerApiId,
    SteamId64
} from './types';
import {CFToolsAuthorizationProvider} from './internal/auth';
import {httpClient} from './internal/http';
import {URLSearchParams} from 'url';

export class CFToolsClientBuilder {
    private serverApiId: ServerApiId | undefined;
    private credentials: LoginCredentials | undefined;

    public withServerApiId(serverApiId: string): CFToolsClientBuilder {
        this.serverApiId = ServerApiId.of(serverApiId);
        return this;
    }

    public withCredentials(applicationId: string, secret: string): CFToolsClientBuilder {
        this.credentials = LoginCredentials.of(applicationId, secret);
        return this;
    }

    public build(): CFToolsClient {
        if (this.serverApiId === undefined) {
            throw new Error('ServerApiId needs to be set.');
        }
        if (this.credentials === undefined) {
            throw new Error('Credentials need to be provided.');
        }
        return new GotCFToolsClient(this.serverApiId, this.credentials)
    }
}

interface GetPlayerResponse {
    [key: string]: {
        omega: {
            name_history: string[],
            playtime: number,
            sessions: number,
        },
        game: {
            general: {
                environment_deaths: number,
                suicides: number,
            }
        }
    },
}

interface GetUserLookupResponse {
    cftools_id: string,
}

interface GetLeaderboardResponse {
    leaderboard: {
        cftools_id: string,
        environment_deaths: number,
        latest_name: string,
        playtime: number,
        rank: number,
        suicides: number,
    }[]
}

interface GetPriorityQueueEntry {
    entries: {
        created_at: string,
        creator: {
            cftools_id: string
        },
        meta: {
            comment: string,
            expiration: string | null,
            from_api: boolean
        },
        updated_at: string,
        user: {
            cftools_id: string
        },
        uuid: string
    }[]
}

function asDate(dateAsString: string): Date {
    if (dateAsString.indexOf('+') !== -1 || dateAsString.endsWith('Z')) {
        return new Date(dateAsString)
    }
    return new Date(dateAsString + 'Z')
}

class GotCFToolsClient implements CFToolsClient {
    private readonly auth: CFToolsAuthorizationProvider;

    constructor(private serverApiId: ServerApiId, credentials: LoginCredentials) {
        this.auth = new CFToolsAuthorizationProvider(credentials);
    }

    async getPlayerDetails(playerId: GenericId): Promise<Player> {
        const id = await this.resolve(playerId);
        const token = await this.auth.provideToken();
        const response = await httpClient(`v1/server/${this.serverApiId.id}/player`, {
            searchParams: {
                cftools_id: id.id,
            },
            headers: {
                Authorization: 'Bearer ' + token
            }
        }).json<GetPlayerResponse>();
        return {
            names: response[id.id].omega.name_history,
        };
    }

    async getLeaderboard(request: GetLeaderboardRequest): Promise<LeaderboardItem[]> {
        const token = await this.auth.provideToken();
        const params = new URLSearchParams();
        params.append('stat', request.statistic);
        if (request.order === 'ASC') {
            params.append('order', '-1');
        } else {
            params.append('order', '1');
        }
        if (request.limit && request.limit > 0 && request.limit <= 100) {
            params.append('limit', request.limit.toString());
        }
        const response = await httpClient(`v1/server/${this.serverApiId.id}/leaderboard`, {
            searchParams: params,
            headers: {
                Authorization: 'Bearer ' + token
            }
        }).json<GetLeaderboardResponse>();
        return response.leaderboard.map((raw) => {
            return {
                name: raw.latest_name,
                rank: raw.rank,
                suicides: raw.suicides,
                environmentDeaths: raw.environment_deaths,
                playtime: raw.playtime,
                id: CFToolsId.of(raw.cftools_id),
            } as LeaderboardItem;
        });
    }

    async getPriorityQueue(playerId: GenericId): Promise<PriorityQueueItem | null> {
        const id = await this.resolve(playerId);
        const response = await httpClient(`v1/server/${this.serverApiId.id}/queuepriority`, {
            searchParams: {
                cftools_id: id.id,
            },
            headers: {
                Authorization: 'Bearer ' + await this.auth.provideToken()
            }
        }).json<GetPriorityQueueEntry>();
        if (response.entries.length === 0) {
            return null;
        }
        const entry = response.entries[0];
        return {
            createdBy: CFToolsId.of(entry.creator.cftools_id),
            comment: entry.meta.comment,
            expiration: entry.meta.expiration ? asDate(entry.meta.expiration) : 'Permanent',
            created: new Date(entry.created_at)
        } as PriorityQueueItem;
    }

    async putPriorityQueue(request: PutPriorityQueueItemRequest): Promise<void> {
        let expires = '';
        if (request.expires !== 'Permanent') {
            expires = request.expires.toISOString();
        }
        await httpClient.post(`v1/server/${this.serverApiId.id}/queuepriority`, {
            body: JSON.stringify({
                cftools_id: request.id.id,
                comment: request.comment,
                expires_at: expires
            }),
            headers: {
                Authorization: 'Bearer ' + await this.auth.provideToken()
            },
        });
    }

    async deletePriorityQueue(playerId: GenericId): Promise<void> {
        const id = await this.resolve(playerId);
        await httpClient.delete(`v1/server/${this.serverApiId.id}/queuepriority`, {
            searchParams: {
                cftools_id: id.id
            },
            headers: {
                Authorization: 'Bearer ' + await this.auth.provideToken()
            },
        });
    }

    private async resolve(id: GenericId): Promise<CFToolsId> {
        if (id instanceof CFToolsId) {
            return id;
        }
        let identifier: string;
        if (id instanceof SteamId64 || id instanceof BohemiaInteractiveId) {
            identifier = id.id;
        } else {
            identifier = id.guid;
        }

        const response = await httpClient('v1/users/lookup', {
            searchParams: {
                identifier,
            },
        }).json<GetUserLookupResponse>();
        return CFToolsId.of(response.cftools_id);
    }
}

export * from './types';
