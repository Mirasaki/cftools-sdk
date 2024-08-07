import {
    Banlist,
    CFToolsClient, CFToolsId,
    DeletePlayerDetailsRequest,
    Game,
    GameServerItem, GameSession,
    GetLeaderboardRequest,
    GetPlayerDetailsRequest,
    GetPriorityQueueRequest, GetWhitelistRequest,
    LeaderboardItem,
    Player,
    PriorityQueueItem, ServerApiId, ServerInfo, SpawnItemRequest,
    Statistic,
    SteamId64, TeleportPlayerRequest, WhitelistItem
} from '../types';
import {CachingCFToolsClient} from './caching-cftools-client';
import {InMemoryCache} from './in-memory-cache';

describe('CachingCFToolsClient', () => {
    let client: CFToolsClient;
    let stubClient: CFToolsClient;

    beforeEach(() => {
        stubClient = {
            getAppGrants: jest.fn(),
            getGameServerDetails: jest.fn(),
            getLeaderboard: jest.fn(),
            getPlayerDetails: jest.fn(),
            deletePlayerDetails: jest.fn(),
            getPriorityQueue: jest.fn(),
            putPriorityQueue: jest.fn(),
            deletePriorityQueue: jest.fn(),
            getWhitelist: jest.fn(),
            putWhitelist: jest.fn(),
            deleteWhitelist: jest.fn(),
            teleport: jest.fn(),
            spawnItem: jest.fn(),
            listGameSessions: jest.fn(),
            getServerInfo: jest.fn(),
            listBans: jest.fn(),
            putBan: jest.fn(),
            deleteBan: jest.fn(),
            deleteBans: jest.fn(),
            resolve: jest.fn(),
            gameLabsAction: jest.fn(),
            killPlayer: jest.fn(),
            healPlayer: jest.fn(),
        };
        client = new CachingCFToolsClient(new InMemoryCache(), {
            appGrants: 60,
            priorityQueue: 30,
            gameSessions: 10,
            serverInfo: 30,
            playerDetails: 30,
            gameServerDetails: 30,
            leaderboard: 30,
            whitelist: 30,
            banlist: 30,
            resolve: 500,
        }, stubClient, ServerApiId.of('AN_ID'));
    });

    describe('caches', () => {
        it('getAppGrants', async () => {
            stubClient.getAppGrants = jest.fn(() => Promise.resolve({
                server: [],
                banlist: []
            }));
            const firstResponse = await client.getAppGrants();
            const secondResponse = await client.getAppGrants();

            expect(stubClient.getAppGrants).toHaveBeenCalledTimes(1);
            expect(firstResponse).toEqual(secondResponse);
        })

        it('getGameServerDetails', async () => {
            stubClient.getGameServerDetails = jest.fn(() => Promise.resolve({
                name: 'someName'
            } as GameServerItem));
            const request = {
                game: Game.DayZ,
                ip: '127.0.0.1',
                port: 2302,
            };
            const firstResponse = await client.getGameServerDetails(request);
            const secondResponse = await client.getGameServerDetails(request);

            expect(stubClient.getGameServerDetails).toHaveBeenCalledTimes(1);
            expect(firstResponse).toEqual(secondResponse);
        });

        it('getPlayerDetails', async () => {
            stubClient.getPlayerDetails = jest.fn(() => Promise.resolve({
                names: ['A_NAME']
            } as Player));
            const request: GetPlayerDetailsRequest = {
                playerId: SteamId64.of('123456789'),
            };
            const firstResponse = await client.getPlayerDetails(request);
            const secondResponse = await client.getPlayerDetails(SteamId64.of('123456789'));

            expect(stubClient.getPlayerDetails).toHaveBeenCalledTimes(1);
            expect(firstResponse).toEqual(secondResponse);
        });

        it('deletePlayerDetails', async () => {
            stubClient.deletePlayerDetails = jest.fn(() => Promise.resolve());
            const request: DeletePlayerDetailsRequest = {
                playerId: SteamId64.of('123456789'),
            };
            const firstResponse = await client.deletePlayerDetails(request);
            const secondResponse = await client.deletePlayerDetails(SteamId64.of('123456789'));

            expect(stubClient.deletePlayerDetails).toHaveBeenCalledTimes(2);
            expect(firstResponse).toEqual(secondResponse);
        })

        it('getPriorityQueue', async () => {
            stubClient.getPriorityQueue = jest.fn(() => Promise.resolve({
                comment: 'SOME_COMMENT'
            } as PriorityQueueItem));
            const request: GetPriorityQueueRequest = {
                playerId: SteamId64.of('123456789'),
            };
            const firstResponse = await client.getPriorityQueue(request);
            const secondResponse = await client.getPriorityQueue(SteamId64.of('123456789'));

            expect(stubClient.getPriorityQueue).toHaveBeenCalledTimes(1);
            expect(firstResponse).toEqual(secondResponse);
        });

        it('getWhitelist', async () => {
            stubClient.getWhitelist = jest.fn(() => Promise.resolve({
                comment: 'SOME_COMMENT'
            } as WhitelistItem));
            const request: GetWhitelistRequest = {
                playerId: SteamId64.of('123456789'),
            };
            const firstResponse = await client.getWhitelist(request);
            const secondResponse = await client.getWhitelist(SteamId64.of('123456789'));

            expect(stubClient.getWhitelist).toHaveBeenCalledTimes(1);
            expect(firstResponse).toEqual(secondResponse);
        });

        it('getBan', async () => {
            await client.listBans({list: Banlist.of('A_BANLIST_ID'), playerId: SteamId64.of('123456789')});
            await client.listBans({list: Banlist.of('A_BANLIST_ID'), playerId: SteamId64.of('123456789')});

            expect(stubClient.listBans).toHaveBeenCalledTimes(2);
        });

        it('getLeaderboard', async () => {
            stubClient.getLeaderboard = jest.fn(() => Promise.resolve([{
                name: 'A_NAME'
            }] as LeaderboardItem[]));
            const request: GetLeaderboardRequest = {
                statistic: Statistic.KILLS,
                order: 'DESC'
            };
            const firstResponse = await client.getLeaderboard(request);
            const secondResponse = await client.getLeaderboard(request);

            expect(stubClient.getLeaderboard).toHaveBeenCalledTimes(1);
            expect(firstResponse).toEqual(secondResponse);
        });

        it('getServerInfo', async () => {
            stubClient.getServerInfo = jest.fn(() => Promise.resolve({
                nickname: 'A_NAME'
            } as ServerInfo));
            const firstResponse = await client.getServerInfo({});
            const secondResponse = await client.getServerInfo({});

            expect(stubClient.getServerInfo).toHaveBeenCalledTimes(1);
            expect(firstResponse).toEqual(secondResponse);
        });

        it('listGameSessions', async () => {
            stubClient.listGameSessions = jest.fn(() => Promise.resolve([{
                id: 'A_GAME_SESSION',
            }] as GameSession[]));
            const firstResponse = await client.listGameSessions({});
            const secondResponse = await client.listGameSessions({});

            expect(stubClient.listGameSessions).toHaveBeenCalledTimes(1);
            expect(firstResponse).toEqual(secondResponse);
        });

        it('resolve', async () => {
            stubClient.resolve = jest.fn(() => Promise.resolve({id: 'SOME_CFTOOLS_ID'} as CFToolsId));
            const firstResponse = await client.resolve({id: 'SOME_STEAM_ID'});
            const secondResponse = await client.resolve({id: 'SOME_STEAM_ID'});

            expect(stubClient.resolve).toHaveBeenCalledTimes(1);
            expect(firstResponse).toEqual(secondResponse);
        });
    });

    describe('does not cache', () => {
        it('deletePriorityQueue', async () => {
            await client.deletePriorityQueue(SteamId64.of('123456789'));
            await client.deletePriorityQueue(SteamId64.of('123456789'));

            expect(stubClient.deletePriorityQueue).toHaveBeenCalledTimes(2);
        });

        it('putPriorityQueue', async () => {
            const request = {
                id: SteamId64.of('123456789'),
                comment: 'SOME_TEXT'
            };
            await client.putPriorityQueue(request);
            await client.putPriorityQueue(request);

            expect(stubClient.putPriorityQueue).toHaveBeenCalledTimes(2);
        });

        it('deleteWhitelist', async () => {
            await client.deleteWhitelist(SteamId64.of('123456789'));
            await client.deleteWhitelist(SteamId64.of('123456789'));

            expect(stubClient.deleteWhitelist).toHaveBeenCalledTimes(2);
        });

        it('putWhitelist', async () => {
            const request = {
                id: SteamId64.of('123456789'),
                comment: 'SOME_TEXT'
            };
            await client.putWhitelist(request);
            await client.putWhitelist(request);

            expect(stubClient.putWhitelist).toHaveBeenCalledTimes(2);
        });

        it('putBan', async () => {
            await client.putBan({
                playerId: CFToolsId.of(process.env.CFTOOLS_BANABLE_CFTOOLS_ID || ''),
                list: Banlist.of('A_BANLIST'),
                expiration: 'Permanent',
                reason: 'cftools-sdk test'
            });
            await client.putBan({
                playerId: CFToolsId.of(process.env.CFTOOLS_BANABLE_CFTOOLS_ID || ''),
                list: Banlist.of('A_BANLIST'),
                expiration: 'Permanent',
                reason: 'cftools-sdk test'
            });

            expect(stubClient.putBan).toHaveBeenCalledTimes(2);
        });

        it('deleteBan', async () => {
            const request = {
                playerId: CFToolsId.of(process.env.CFTOOLS_BANABLE_CFTOOLS_ID || ''),
                list: Banlist.of('A_BANLIST'),
            };

            await client.deleteBan(request);
            await client.deleteBan(request);

            expect(stubClient.deleteBan).toHaveBeenCalledTimes(2);
        });

        it('deleteBan', async () => {
            const request = {
                playerId: CFToolsId.of(process.env.CFTOOLS_BANABLE_CFTOOLS_ID || ''),
                list: Banlist.of('A_BANLIST'),
            };

            await client.deleteBans(request);
            await client.deleteBans(request);

            expect(stubClient.deleteBans).toHaveBeenCalledTimes(2);
        });

        it('spawnItem', async () => {
            const spawnItemRequest: SpawnItemRequest = {
                itemClass: 'SOME_CLASS',
                session: {id: 'SOME_SESSION'} as GameSession
            }
            await client.spawnItem(spawnItemRequest);
            await client.spawnItem(spawnItemRequest);

            expect(stubClient.spawnItem).toHaveBeenCalledTimes(2);
        });

        it('teleport', async () => {
            const teleportRequest: TeleportPlayerRequest = {
                session: {id: 'SOME_SESSION'} as GameSession,
                coordinates: {
                    x: 100,
                    y: 100,
                    z: 100,
                }
            }
            await client.teleport(teleportRequest);
            await client.teleport(teleportRequest);

            expect(stubClient.teleport).toHaveBeenCalledTimes(2);
        });
    });
});
