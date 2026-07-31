export const config = {
  port: parseInt(process.env.PORT || '10000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isDevelopment: process.env.NODE_ENV !== 'production',
};
