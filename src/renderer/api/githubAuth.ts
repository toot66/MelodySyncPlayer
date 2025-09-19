import axios from 'axios';

/**
 * Exchange GitHub OAuth `code` for access token and fetch user info.
 * WARNING: This implementation exposes client_secret in renderer process which is NOT secure.
 * It is only suitable for demo / development. In production please proxy through your backend service.
 */
export const loginByGithub = async (code: string) => {
  const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID as string;
  const clientSecret = import.meta.env.VITE_GITHUB_CLIENT_SECRET as string;

  if (!clientId || !clientSecret) {
    throw new Error('Missing GitHub OAuth env variables');
  }

  // Step 1: exchange code for access token
  const tokenResp = await axios.post(
    'https://github.com/login/oauth/access_token',
    {
      client_id: clientId,
      client_secret: clientSecret,
      code
    },
    {
      headers: {
        Accept: 'application/json'
      }
    }
  );

  if (!tokenResp.data.access_token) {
    throw new Error('获取 GitHub access_token 失败');
  }

  const accessToken = tokenResp.data.access_token as string;

  // Step 2: fetch user profile
  const userResp = await axios.get('https://api.github.com/user', {
    headers: {
      Authorization: `token ${accessToken}`
    }
  });

  return {
    accessToken,
    user: userResp.data
  };
};