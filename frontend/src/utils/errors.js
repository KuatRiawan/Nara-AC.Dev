
export function getErrorMessage(error, defaultMessage = 'Terjadi kesalahan') {
  if (error?.response?.data?.error?.message) {
    return error.response.data.error.message;
  }
  
  if (error?.error?.message) {
    return error.error.message;
  }
  
  if (error?.message) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  if (error?.response?.data && typeof error.response.data === 'string') {
    return error.response.data;
  }
  
  return defaultMessage;
}

export function getAxiosErrorMessage(error, defaultMessage = 'Terjadi kesalahan jaringan') {
  if (error?.response?.data?.error?.message) {
    return error.response.data.error.message;
  }
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  if (error?.response?.statusText) {
    return error.response.statusText;
  }
  if (error?.message) {
    return error.message;
  }
  return defaultMessage;
}

export default { getErrorMessage, getAxiosErrorMessage };
