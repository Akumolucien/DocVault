const TOKEN_KEYS = {
  id: 'docvault_id_token',
  access: 'docvault_access_token',
  refresh: 'docvault_refresh_token',
  email: 'docvault_email'
};

const OAUTH_KEYS = {
  verifier: 'docvault_pkce_verifier',
  state: 'docvault_oauth_state'
};

const COGNITO_DOMAIN =
  'https://docvault-secure-app-2026.auth.us-east-1.amazoncognito.com';

const OAUTH_REDIRECT_URI =
  'https://main.d1m785n1y8pf00.amplifyapp.com/login.html';

async function cognitoRequest(target, payload) {
  const response = await fetch(COGNITO_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target':
        `AWSCognitoIdentityProviderService.${target}`
    },
    body: JSON.stringify(payload)
  });

  const data =
    await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      data.message ||
      data.Message ||
      data.__type ||
      `Cognito error ${response.status}`;

    throw new Error(message);
  }

  return data;
}

function decodeJwt(token) {
  try {
    const payload = token
      .split('.')[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    return JSON.parse(
      decodeURIComponent(
        atob(payload)
          .split('')
          .map(
            c =>
              '%' +
              (
                '00' +
                c.charCodeAt(0).toString(16)
              ).slice(-2)
          )
          .join('')
      )
    );

  } catch {
    return null;
  }
}

function tokenIsValid(token) {
  if (!token) return false;

  const payload = decodeJwt(token);

  return Boolean(
    payload?.exp &&
    payload.exp * 1000 > Date.now() + 30000
  );
}

function saveSession(authenticationResult, email) {
  if (authenticationResult.IdToken) {
    localStorage.setItem(
      TOKEN_KEYS.id,
      authenticationResult.IdToken
    );
  }

  if (authenticationResult.AccessToken) {
    localStorage.setItem(
      TOKEN_KEYS.access,
      authenticationResult.AccessToken
    );
  }

  if (authenticationResult.RefreshToken) {
    localStorage.setItem(
      TOKEN_KEYS.refresh,
      authenticationResult.RefreshToken
    );
  }

  if (email) {
    localStorage.setItem(
      TOKEN_KEYS.email,
      email
    );
  }
}

function clearSession() {
  Object.values(TOKEN_KEYS)
    .forEach(
      key => localStorage.removeItem(key)
    );
}

function clearOAuthState() {
  Object.values(OAUTH_KEYS)
    .forEach(
      key => sessionStorage.removeItem(key)
    );
}

function getIdToken() {
  return localStorage.getItem(
    TOKEN_KEYS.id
  );
}

function getAccessToken() {
  return localStorage.getItem(
    TOKEN_KEYS.access
  );
}

function getCurrentUser() {
  const token = getIdToken();
  const payload = decodeJwt(token);

  return {
    email:
      payload?.email ||
      localStorage.getItem(
        TOKEN_KEYS.email
      ) ||
      '',

    username:
      payload?.['cognito:username'] ||
      payload?.sub ||
      ''
  };
}

async function signUp(email, password) {
  return cognitoRequest(
    'SignUp',
    {
      ClientId: COGNITO_CLIENT_ID,
      Username: email,
      Password: password,
      UserAttributes: [
        {
          Name: 'email',
          Value: email
        }
      ]
    }
  );
}

async function confirmSignUp(email, code) {
  return cognitoRequest(
    'ConfirmSignUp',
    {
      ClientId: COGNITO_CLIENT_ID,
      Username: email,
      ConfirmationCode: code
    }
  );
}

async function signIn(email, password) {
  const data =
    await cognitoRequest(
      'InitiateAuth',
      {
        AuthFlow:
          'USER_PASSWORD_AUTH',

        ClientId:
          COGNITO_CLIENT_ID,

        AuthParameters: {
          USERNAME: email,
          PASSWORD: password
        }
      }
    );

  if (!data.AuthenticationResult) {
    throw new Error(
      `Additional Cognito challenge required: ${
        data.ChallengeName ||
        'unknown challenge'
      }`
    );
  }

  saveSession(
    data.AuthenticationResult,
    email
  );

  return data.AuthenticationResult;
}

function base64UrlEncode(buffer) {
  const bytes =
    new Uint8Array(buffer);

  let binary = '';

  bytes.forEach(
    byte => {
      binary +=
        String.fromCharCode(byte);
    }
  );

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function generateRandomString(length = 64) {
  const characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ' +
    'abcdefghijklmnopqrstuvwxyz' +
    '0123456789-._~';

  const randomValues =
    new Uint8Array(length);

  crypto.getRandomValues(
    randomValues
  );

  let result = '';

  for (
    let i = 0;
    i < randomValues.length;
    i++
  ) {
    result +=
      characters[
        randomValues[i] %
        characters.length
      ];
  }

  return result;
}

async function createCodeChallenge(verifier) {
  const encoded =
    new TextEncoder()
      .encode(verifier);

  const digest =
    await crypto.subtle.digest(
      'SHA-256',
      encoded
    );

  return base64UrlEncode(
    digest
  );
}

async function signInWithGoogle() {
  const verifier =
    generateRandomString(64);

  const state =
    generateRandomString(32);

  const challenge =
    await createCodeChallenge(
      verifier
    );

  sessionStorage.setItem(
    OAUTH_KEYS.verifier,
    verifier
  );

  sessionStorage.setItem(
    OAUTH_KEYS.state,
    state
  );

  const params =
    new URLSearchParams({
      client_id:
        COGNITO_CLIENT_ID,

      response_type:
        'code',

      scope:
        'openid email profile',

      redirect_uri:
        OAUTH_REDIRECT_URI,

      identity_provider:
        'Google',

      state:
        state,

      code_challenge:
        challenge,

      code_challenge_method:
        'S256'
    });

  window.location.href =
    `${COGNITO_DOMAIN}/oauth2/authorize?${params.toString()}`;
}

async function exchangeOAuthCode(code) {
  const verifier =
    sessionStorage.getItem(
      OAUTH_KEYS.verifier
    );

  if (!verifier) {
    throw new Error(
      'Google sign-in session was not found. Please try again.'
    );
  }

  const body =
    new URLSearchParams({
      grant_type:
        'authorization_code',

      client_id:
        COGNITO_CLIENT_ID,

      code:
        code,

      redirect_uri:
        OAUTH_REDIRECT_URI,

      code_verifier:
        verifier
    });

  const response =
    await fetch(
      `${COGNITO_DOMAIN}/oauth2/token`,
      {
        method: 'POST',

        headers: {
          'Content-Type':
            'application/x-www-form-urlencoded'
        },

        body:
          body.toString()
      }
    );

  const data =
    await response
      .json()
      .catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.error_description ||
      data.error ||
      'Unable to complete Google sign-in.'
    );
  }

  const authenticationResult = {
    IdToken:
      data.id_token,

    AccessToken:
      data.access_token,

    RefreshToken:
      data.refresh_token
  };

  const payload =
    decodeJwt(
      authenticationResult.IdToken
    );

  saveSession(
    authenticationResult,
    payload?.email || ''
  );

  clearOAuthState();

  return authenticationResult;
}

async function handleOAuthCallback() {
  const params =
    new URLSearchParams(
      window.location.search
    );

  const error =
    params.get('error');

  const errorDescription =
    params.get(
      'error_description'
    );

  if (error) {
    clearOAuthState();

    const cleanUrl =
      window.location.origin +
      window.location.pathname;

    window.history.replaceState(
      {},
      document.title,
      cleanUrl
    );

    throw new Error(
      errorDescription ||
      error
    );
  }

  const code =
    params.get('code');

  if (!code) {
    return false;
  }

  const returnedState =
    params.get('state');

  const storedState =
    sessionStorage.getItem(
      OAUTH_KEYS.state
    );

  if (
    !storedState ||
    returnedState !== storedState
  ) {
    clearOAuthState();

    throw new Error(
      'Invalid Google sign-in state. Please try again.'
    );
  }

  await exchangeOAuthCode(code);

  window.history.replaceState(
    {},
    document.title,
    OAUTH_REDIRECT_URI
  );

  window.location.href =
    'index.html';

  return true;
}

async function refreshSession() {
  const refreshToken =
    localStorage.getItem(
      TOKEN_KEYS.refresh
    );

  if (!refreshToken) {
    return false;
  }

  try {
    const data =
      await cognitoRequest(
        'InitiateAuth',
        {
          AuthFlow:
            'REFRESH_TOKEN_AUTH',

          ClientId:
            COGNITO_CLIENT_ID,

          AuthParameters: {
            REFRESH_TOKEN:
              refreshToken
          }
        }
      );

    saveSession({
      ...data.AuthenticationResult,
      RefreshToken:
        refreshToken
    });

    return true;

  } catch {
    clearSession();
    return false;
  }
}

async function ensureAuthenticated() {
  if (
    tokenIsValid(
      getIdToken()
    )
  ) {
    return true;
  }

  if (
    await refreshSession()
  ) {
    return true;
  }

  clearSession();

  window.location.href =
    'login.html';

  return false;
}

function logout() {
  clearSession();
  clearOAuthState();

  window.location.href =
    'login.html';
}

(async function processOAuthRedirect() {
  const params =
    new URLSearchParams(
      window.location.search
    );

  if (
    !params.has('code') &&
    !params.has('error')
  ) {
    return;
  }

  try {
    await handleOAuthCallback();

  } catch (err) {
    const message =
      document.getElementById(
        'authMessage'
      );

    if (message) {
      message.textContent =
        err.message;

      message.className =
        'auth-message error';
    } else {
      console.error(err);
    }
  }
})();