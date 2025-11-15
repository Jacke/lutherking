/**
 * Mock Authentication for Development
 *
 * This provides a simple mock user session to bypass authentication during development.
 * To re-enable real authentication, restore the original code in the affected files.
 *
 * Uses existing user ID=1 from database (test@orator.ai)
 */

export const MOCK_USER = {
  id: '1', // Using existing user from database
  email: 'test@orator.ai',
  name: 'Test User',
};

export const MOCK_SESSION = {
  user: MOCK_USER,
  expires: '2099-12-31',
};

export function getMockSession() {
  return MOCK_SESSION;
}

export async function getMockUser() {
  // Return mock user with credits for development
  // This corresponds to user ID=1 in the database
  return {
    id: 1, // Integer ID from database
    email: MOCK_USER.email,
    password: '', // Not used in mock mode
    credits: 100, // Default credits for testing
    createdAt: new Date(),
  };
}
