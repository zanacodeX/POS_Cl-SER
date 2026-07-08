import axios from 'axios'

const client = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
})

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      if (error.response.status === 401) {
        localStorage.removeItem('token')
        window.location.href = '/login'
      }
      if (error.response.status === 403 && error.response.data?.code === 'LICENSE_REQUIRED') {
        window.location.href = '/license'
      }
      if (error.response.status === 403 && error.response.data?.code === 'LICENSE_DEACTIVATED') {
        window.location.href = '/license'
      }
    }
    return Promise.reject(error)
  }
)

export default client
