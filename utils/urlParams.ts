export interface URLParams {
  userId: string | null;
  token: string | null;
  artifactId: string | null;
  baseUrl: string | null;
}

export const getURLParams = (): URLParams => {
  const params = new URLSearchParams(window.location.search);
  let baseUrl = params.get('base_url');

  // Remove trailing slash if present
  if (baseUrl && baseUrl.endsWith('/')) {
    baseUrl = baseUrl.slice(0, -1);
  }

  return {
    userId: params.get('userId'),
    token: params.get('token'),
    artifactId: params.get('artifact_id'),
    baseUrl: baseUrl,
  };
};

export const hasRequiredParams = (params: URLParams): boolean => {
  return !!(params.userId && params.token && params.artifactId && params.baseUrl);
};
