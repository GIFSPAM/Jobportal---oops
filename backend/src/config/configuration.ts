/** Application configuration validated at boot. */
export default () => ({
  port: Number(process.env.PORT ?? 5000),
  database: {
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 3306),
    username: process.env.DB_USER ?? 'jobportal',
    password: process.env.DB_PASS ?? 'jobportal',
    name: process.env.DB_NAME ?? 'job_portal',
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? '',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '10d',
  },
  security: {
    adminSecret: process.env.ADMIN_SECRET ?? '',
    bcryptRounds: Number(process.env.BCRYPT_ROUNDS ?? 10),
  },
  storage: {
    uploadsDir: process.env.UPLOADS_DIR ?? 'uploads',
    cloudinary: {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME ?? '',
      apiKey: process.env.CLOUDINARY_API_KEY ?? '',
      apiSecret: process.env.CLOUDINARY_API_SECRET ?? '',
    },
  },
});
