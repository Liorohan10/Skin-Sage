// Centralized API client for better error handling and consistency

interface ApiResponse<T> {
  data?: T
  error?: string
  status: number
}

class ApiClient {
  private baseUrl: string
  private timeout: number

  constructor(baseUrl = '', timeout = 30000) {
    this.baseUrl = baseUrl
    this.timeout = timeout
  }

  private async fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      })
      clearTimeout(timeoutId)
      return response
    } catch (error) {
      clearTimeout(timeoutId)
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timed out')
      }
      throw error
    }
  }

  async post<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      })

      const responseData = await response.json()

      return {
        data: response.ok ? responseData : undefined,
        error: response.ok ? undefined : responseData.error || 'Request failed',
        status: response.status
      }
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Network error',
        status: 0
      }
    }
  }

  async postFormData<T>(endpoint: string, formData: FormData): Promise<ApiResponse<T>> {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        body: formData
      })

      const responseData = await response.json()

      return {
        data: response.ok ? responseData : undefined,
        error: response.ok ? undefined : responseData.error || 'Request failed',
        status: response.status
      }
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Network error',
        status: 0
      }
    }
  }
}

// Export singleton instance
export const apiClient = new ApiClient()

// Specific API functions
export async function analyzeSkincareProfile(formData: FormData) {
  return apiClient.postFormData('/api/analyze', formData)
}

export async function testDemo(data: any) {
  return apiClient.post('/api/demo', data)
}