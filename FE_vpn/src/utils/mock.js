const mock = {
    user: {
        id: 'user-1',
        name: 'Player One',
        email: 'player@example.com',
        role: 'user',
    },
    session: {
        remainingMinutes: 180,
        queuePosition: null,
        vpn: {
            status: 'offline',
            ip: '10.0.8.12',
        },
    },
    machines: [
        {
            id: 'vm-101',
            name: 'RTX4080 - SG',
            region: 'Singapore',
            ping: 32,
            status: 'idle',
            spec: '8vCPU / 32GB / RTX 4080',
        },
        {
            id: 'vm-202',
            name: 'RTX3080 - JP',
            region: 'Tokyo',
            ping: 51,
            status: 'busy',
            spec: '6vCPU / 24GB / RTX 3080',
        },
        {
            id: 'vm-303',
            name: 'Cloud Lite - US',
            region: 'San Jose',
            ping: 168,
            status: 'idle',
            spec: '4vCPU / 16GB / T4',
        },
    ],
    history: [
        {
            id: 'h1',
            machine: 'RTX4080 - SG',
            start: '2026-01-10 18:40',
            duration: '95 phút',
            snapshot: true,
        },
        {
            id: 'h2',
            machine: 'Cloud Lite - US',
            start: '2026-01-09 21:10',
            duration: '60 phút',
            snapshot: false,
        },
    ],
    payments: [
        { id: 'p1', user: 'Player One', amount: 200000, method: 'Momo', time: '2026-01-12 10:05' },
        { id: 'p2', user: 'Player Two', amount: 500000, method: 'Bank', time: '2026-01-11 18:22' },
        { id: 'p3', user: 'Player One', amount: 150000, method: 'Cash', time: '2026-01-09 09:10' },
    ],
    players: [
        {
            id: 'u1',
            name: 'Player One',
            phone: '0901 234 567',
            credit: 150000,
            hoursUsed: 45,
            hoursBalance: 12,
            lastTopup: '2026-01-12',
        },
        {
            id: 'u2',
            name: 'Player Two',
            phone: '0909 888 222',
            credit: 50000,
            hoursUsed: 22,
            hoursBalance: 4,
            lastTopup: '2026-01-11',
        },
        {
            id: 'u3',
            name: 'Lan Gamer',
            phone: '0933 123 999',
            credit: 320000,
            hoursUsed: 60,
            hoursBalance: 30,
            lastTopup: '2026-01-10',
        },
    ],
}

export default mock
