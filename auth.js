const TOKEN_KEYS = {
  id: 'docvault_id_token',
  access: 'docvault_access_token',
  refresh: 'docvault_refresh_token',
  email: 'docvault_email'
};

async function cognitoRequest(target, payload) {
  const response = await fetch(COGNITO_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': `AWSCognitoIdentityProviderService.${target}`
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data.message || data.Message || data.__type || `Cognito error ${response.status}`;
    throw new Error(message);
  }
  return data;
}

function decodeJwt(token) {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(decodeURIComponent(atob(payload).split('').map(c =>
      '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
    ).join('')));
  } catch {
    return null;
  }
}

function tokenIsValid(token) {
  if (!token) return false;
  const payload = decodeJwt(token);
  return Boolean(payload?.exp && payload.exp * 1000 > Date.now() + 30000);
}

function saveSession(authenticationResult, email) {
  if (authenticationResult.IdToken) localStorage.setItem(TOKEN_KEYS.id, authenticationResult.IdToken);
  if (authenticationResult.AccessToken) localStorage.setItem(TOKEN_KEYS.access, authenticationResult.AccessToken);
  if (authenticationResult.RefreshToken) localStorage.setItem(TOKEN_KEYS.refresh, authenticationResult.RefreshToken);
  if (email) localStorage.setItem(TOKEN_KEYS.email, email);
}

function clearSession() {
  Object.values(TOKEN_KEYS).forEach(key => localStorage.removeItem(key));
}

function getIdToken() {
  return localStorage.getItem(TOKEN_KEYS.id);
}

function getAccessToken() {
  return localStorage.getItem(TOKEN_KEYS.access);
}

function getCurrentUser() {
  const token = getIdToken();
  const payload = decodeJwt(token);
  return {
    email: payload?.email || localStorage.getItem(TOKEN_KEYS.email) || '',
    username: payload?.['cognito:username'] || payload?.sub || ''
  };
}

async function signUp(email, password) {
  return cognitoRequest('SignUp', {
    ClientId: COGNITO_CLIENT_ID,
    Username: email,
    Password: password,
    UserAttributes: [{ Name: 'email', Value: email }]
  });
}

async function confirmSignUp(email, code) {
  return cognitoRequest('ConfirmSignUp', {
    ClientId: COGNITO_CLIENT_ID,
    Username: email,
    ConfirmationCode: code
  });
}

async function signIn(email, password) {
  const data = await cognitoRequest('InitiateAuth', {
    AuthFlow: 'USER_PASSWORD_AUTH',
    ClientId: COGNITO_CLIENT_ID,
    AuthParameters: {
      USERNAME: email,
      PASSWORD: password
    }
  });

  if (!data.AuthenticationResult) {
    throw new Error(`Additional Cognito challenge required: ${data.ChallengeName || 'unknown challenge'}`);
  }

  saveSession(data.AuthenticationResult, email);
  return data.AuthenticationResult;
}

async function refreshSession() {
  const refreshToken = localStorage.getItem(TOKEN_KEYS.refresh);
  if (!refreshToken) return false;

  try {
    const data = await cognitoRequest('InitiateAuth', {
      AuthFlow: 'REFRESH_TOKEN_AUTH',
      ClientId: COGNITO_CLIENT_ID,
      AuthParameters: { REFRESH_TOKEN: refreshToken }
    });
    saveSession({ ...data.AuthenticationResult, RefreshToken: refreshToken });
    return true;
  } catch {
    clearSession();
    return false;
  }
}

async function ensureAuthenticated() {
  if (tokenIsValid(getIdToken())) return true;
  if (await refreshSession()) return true;
  clearSession();
  window.location.href = 'login.html';
  return false;
}

function logout() {
  clearSession();
  window.location.href = 'login.html';
}
