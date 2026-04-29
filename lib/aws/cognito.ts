const required = (key: string) => {
  const value = process.env[key];
  if (!value) throw new Error(`Missing env var: ${key}`);
  return value;
};

export const cognitoConfig = {
  domain: required("NEXT_PUBLIC_COGNITO_DOMAIN"),
  clientId: required("NEXT_PUBLIC_COGNITO_CLIENT_ID"),
  redirectUri: required("NEXT_PUBLIC_COGNITO_REDIRECT_URI"),
  logoutUri: required("NEXT_PUBLIC_COGNITO_LOGOUT_URI"),
  responseType: "code",
  scopes: ["openid", "email", "profile"]
};

export const getHostedLoginUrl = () => {
  const params = new URLSearchParams({
    response_type: cognitoConfig.responseType,
    client_id: cognitoConfig.clientId,
    redirect_uri: cognitoConfig.redirectUri,
    scope: cognitoConfig.scopes.join(" ")
  });
  return `https://${cognitoConfig.domain}/oauth2/authorize?${params.toString()}`;
};

export const getHostedLogoutUrl = () => {
  const params = new URLSearchParams({
    client_id: cognitoConfig.clientId,
    logout_uri: cognitoConfig.logoutUri
  });
  return `https://${cognitoConfig.domain}/logout?${params.toString()}`;
};
