import { request } from './client'

export async function googleLogin() {
    return request('/auth/google/login')
}
