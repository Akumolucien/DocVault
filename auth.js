const TOKEN_KEYS = {
  id: 'docvault_id_token',
  access: 'docvault_access_token',
  refresh: 'docvault_refresh_token',
  email: 'docvault_email'
};

const COGNITO_DOMAIN =
  'https://docvault-secure-app-2026.auth.us-east-1.amazoncognito.com';

const OAUTH_REDIRECT_URI =
  'https://main.d1m785n1y8pf00.amplifyapp.com/login.html';

const OAUTH_LOGOUT_URI =
  'https://main.d1m785n1y8pf00.amplifyapp.com';

const PKCE_VERIFIER_KEY =
  'docvault_pkce_verifier';

const OAUTH_STATE_KEY =
  'docvault_oauth_state';


async function cognitoRequest(
  target,
  payload
) {
  const response = await fetch(
    COGNITO_ENDPOINT,
    {
      method: 'POST',

      headers: {
        'Content-Type':
          'application/x-amz-json-1.1',

        'X-Amz-Target':
          `AWSCognitoIdentityProviderService.${target}`
      },

      body: JSON.stringify(
        payload
      )
    }
  );

  const data =
    await response
      .json()
      .catch(
        () => ({})
      );

  if (!response.ok) {
    const message =
      data.message ||
      data.Message ||
      data.__type ||
      `Cognito error ${response.status}`;

    throw new Error(
      message
    );
  }

  return data;
}


function decodeJwt(
  token
) {
  try {
    const payload =
      token
        .split('.')[1]
        .replace(
          /-/g,
          '+'
        )
        .replace(
          /_/g,
          '/'
        );

    const padded =
      payload +
      '='.repeat(
        (4 - payload.length % 4) % 4
      );

    return JSON.parse(
      decodeURIComponent(
        atob(padded)
          .split('')
          .map(
            c =>
              '%' +
              (
                '00' +
                c
                  .charCodeAt(0)
                  .toString(16)
              ).slice(-2)
          )
          .join('')
      )
    );
  }

  catch {
    return null;
  }
}


function tokenIsValid(
  token
) {
  if (!token) {
    return false;
  }

  const payload =
    decodeJwt(
      token
    );

  return Boolean(
    payload?.exp &&
    payload.exp * 1000 >
      Date.now() + 30000
  );
}


function saveSession(
  authenticationResult,
  email
) {
  const idToken =
    authenticationResult.IdToken ||
    authenticationResult.id_token;

  const accessToken =
    authenticationResult.AccessToken ||
    authenticationResult.access_token;

  const refreshToken =
    authenticationResult.RefreshToken ||
    authenticationResult.refresh_token;

  if (idToken) {
    localStorage.setItem(
      TOKEN_KEYS.id,
      idToken
    );
  }

  if (accessToken) {
    localStorage.setItem(
      TOKEN_KEYS.access,
      accessToken
    );
  }

  if (refreshToken) {
    localStorage.setItem(
      TOKEN_KEYS.refresh,
      refreshToken
    );
  }

  let userEmail =
    email;

  if (
    !userEmail &&
    idToken
  ) {
    userEmail =
      decodeJwt(
        idToken
      )?.email;
  }

  if (userEmail) {
    localStorage.setItem(
      TOKEN_KEYS.email,
      userEmail
    );
  }
}


function clearSession() {
  Object.values(
    TOKEN_KEYS
  ).forEach(
    key =>
      localStorage.removeItem(
        key
      )
  );

  sessionStorage.removeItem(
    PKCE_VERIFIER_KEY
  );

  sessionStorage.removeItem(
    OAUTH_STATE_KEY
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


function getApiToken() {
  const idToken =
    getIdToken();

  if (
    tokenIsValid(
      idToken
    )
  ) {
    return idToken;
  }

  return null;
}


function getCurrentUser() {
  const token =
    getIdToken();

  const payload =
    decodeJwt(
      token
    );

  return {
    email:
      payload?.email ||
      localStorage.getItem(
        TOKEN_KEYS.email
      ) ||
      '',

    username:
      payload?.['cognito:username'] ||
      payload?.name ||
      payload?.email ||
      payload?.sub ||
      ''
  };
}


async function signUp(
  email,
  password
) {
  return cognitoRequest(
    'SignUp',
    {
      ClientId:
        COGNITO_CLIENT_ID,

      Username:
        email,

      Password:
        password,

      UserAttributes: [
        {
          Name:
            'email',

          Value:
            email
        }
      ]
    }
  );
}


async function confirmSignUp(
  email,
  code
) {
  return cognitoRequest(
    'ConfirmSignUp',
    {
      ClientId:
        COGNITO_CLIENT_ID,

      Username:
        email,

      ConfirmationCode:
        code
    }
  );
}


async function signIn(
  email,
  password
) {
  const data =
    await cognitoRequest(
      'InitiateAuth',
      {
        AuthFlow:
          'USER_PASSWORD_AUTH',

        ClientId:
          COGNITO_CLIENT_ID,

        AuthParameters: {
          USERNAME:
            email,

          PASSWORD:
            password
        }
      }
    );

  if (
    !data.AuthenticationResult
  ) {
    throw new Error(
      `Additional Cognito challenge required: ${
        data.ChallengeName ||
        'unknown challenge'
      }`
    );
  }

  clearSession();

  saveSession(
    data.AuthenticationResult,
    email
  );

  return data.AuthenticationResult;
}


function base64UrlEncode(
  bytes
) {
  let binary = '';

  bytes.forEach(
    byte => {
      binary +=
        String.fromCharCode(
          byte
        );
    }
  );

  return btoa(binary)
    .replace(
      /\+/g,
      '-'
    )
    .replace(
      /\//g,
      '_'
    )
    .replace(
      /=+$/,
      ''
    );
}


function generateRandomString(
  length = 64
) {
  const bytes =
    new Uint8Array(
      length
    );

  crypto.getRandomValues(
    bytes
  );

  return base64UrlEncode(
    bytes
  );
}


async function createCodeChallenge(
  verifier
) {
  const data =
    new TextEncoder()
      .encode(
        verifier
      );

  const digest =
    await crypto.subtle.digest(
      'SHA-256',
      data
    );

  return base64UrlEncode(
    new Uint8Array(
      digest
    )
  );
}


async function signInWithGoogle() {
  const verifier =
    generateRandomString(
      64
    );

  const challenge =
    await createCodeChallenge(
      verifier
    );

  const state =
    generateRandomString(
      32
    );

  sessionStorage.setItem(
    PKCE_VERIFIER_KEY,
    verifier
  );

  sessionStorage.setItem(
    OAUTH_STATE_KEY,
    state
  );

  const params =
    new URLSearchParams({
      identity_provider:
        'Google',

      response_type:
        'code',

      client_id:
        COGNITO_CLIENT_ID,

      redirect_uri:
        OAUTH_REDIRECT_URI,

      scope:
        'openid email profile',

      state:
        state,

      code_challenge_method:
        'S256',

      code_challenge:
        challenge
    });

  window.location.href =
    `${COGNITO_DOMAIN}/oauth2/authorize?${params.toString()}`;
}


async function exchangeAuthorizationCode(
  code
) {
  const verifier =
    sessionStorage.getItem(
      PKCE_VERIFIER_KEY
    );

  if (!verifier) {
    throw new Error(
      'Google login session expired. Please try again.'
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
        method:
          'POST',

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
      .catch(
        () => ({})
      );

  if (!response.ok) {
    throw new Error(
      data.error_description ||
      data.error ||
      'Unable to complete Google login.'
    );
  }

  clearSession();

  saveSession(
    data
  );

  return data;
}


async function handleOAuthCallback() {
  const params =
    new URLSearchParams(
      window.location.search
    );

  const error =
    params.get(
      'error'
    );

  if (error) {
    const description =
      params.get(
        'error_description'
      );

    history.replaceState(
      {},
      document.title,
      window.location.pathname
    );

    throw new Error(
      description ||
      error
    );
  }

  const code =
    params.get(
      'code'
    );

  if (!code) {
    return false;
  }

  const returnedState =
    params.get(
      'state'
    );

  const expectedState =
    sessionStorage.getItem(
      OAUTH_STATE_KEY
    );

  if (
    !returnedState ||
    !expectedState ||
    returnedState !==
      expectedState
  ) {
    throw new Error(
      'Invalid OAuth state. Please try signing in again.'
    );
  }

  await exchangeAuthorizationCode(
    code
  );

  history.replaceState(
    {},
    document.title,
    window.location.pathname
  );

  window.location.href =
    'index.html';

  return true;
}


async function refreshWithOAuth(
  refreshToken
) {
  const body =
    new URLSearchParams({
      grant_type:
        'refresh_token',

      client_id:
        COGNITO_CLIENT_ID,

      refresh_token:
        refreshToken
    });

  const response =
    await fetch(
      `${COGNITO_DOMAIN}/oauth2/token`,
      {
        method:
          'POST',

        headers: {
          'Content-Type':
            'application/x-www-form-urlencoded'
        },

        body:
          body.toString()
      }
    );

  if (
    !response.ok
  ) {
    return false;
  }

  const data =
    await response.json();

  saveSession({
    ...data,

    refresh_token:
      refreshToken
  });

  return true;
}


async function refreshWithCognito(
  refreshToken
) {
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
  }

  catch {
    return false;
  }
}


async function refreshSession() {
  const refreshToken =
    localStorage.getItem(
      TOKEN_KEYS.refresh
    );

  if (
    !refreshToken
  ) {
    return false;
  }

  if (
    await refreshWithOAuth(
      refreshToken
    )
  ) {
    return true;
  }

  if (
    await refreshWithCognito(
      refreshToken
    )
  ) {
    return true;
  }

  clearSession();

  return false;
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

  const params =
    new URLSearchParams({
      client_id:
        COGNITO_CLIENT_ID,

      logout_uri:
        OAUTH_LOGOUT_URI
    });

  window.location.href =
    `${COGNITO_DOMAIN}/logout?${params.toString()}`;
}


async function initializeGoogleSignIn() {
  const googleButton =
    document.getElementById(
      'googleButton'
    );

  if (!googleButton) {
    return;
  }

  googleButton.addEventListener(
    'click',
    async () => {
      try {
        await signInWithGoogle();
      }

      catch (err) {
        console.error(
          err
        );

        const message =
          document.getElementById(
            'authMessage'
          );

        if (message) {
          message.textContent =
            err.message;

          message.className =
            'auth-message error';
        }
      }
    }
  );
}


window.addEventListener(
  'load',
  async () => {
    try {
      const handled =
        await handleOAuthCallback();

      if (handled) {
        return;
      }

      await initializeGoogleSignIn();
    }

    catch (err) {
      console.error(
        err
      );

      const message =
        document.getElementById(
          'authMessage'
        );

      if (message) {
        message.textContent =
          err.message;

        message.className =
          'auth-message error';
      }
    }
  }
);