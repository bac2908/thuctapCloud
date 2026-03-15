import { request } from './client'

function buildQuery(params = {}) {
    const entries = Object.entries(params)
        .filter(([, value]) => value !== undefined && value !== null && value !== '')
        .map(([key, value]) => [key, String(value)])
    const search = new URLSearchParams(entries)
    const query = search.toString()
    return query ? `?${query}` : ''
}

export async function listMachines(params) {
    const query = buildQuery(params)
    return request(`/machines${query}`)
}

export async function getMachine(machineId, token) {
    return request(`/machines/${machineId}`, { token })
}

export async function startMachine(machineId, token) {
    return request(`/machines/${machineId}/start`, { method: 'POST', token })
}

export async function resumeMachine(machineId, token) {
    return request(`/machines/${machineId}/resume`, { method: 'POST', token })
}
