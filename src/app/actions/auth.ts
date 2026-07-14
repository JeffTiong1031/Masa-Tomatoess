'use server';

export async function verifyPassword(password: string): Promise<boolean> {
  const appPassword = process.env.APP_PASSWORD;
  
  // If no password is set on the server, we might want to default to denying or allowing.
  // For safety, let's say if it's not set, we require an exact match which is impossible, 
  // or we just allow if no password is set (dev mode). Let's be strict.
  if (!appPassword) {
    console.warn('APP_PASSWORD is not set in environment variables.');
    // Fallback for development if needed, but strict is safer.
    return false; 
  }

  return password === appPassword;
}
