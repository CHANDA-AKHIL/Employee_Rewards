import * as Minio from 'minio';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';

const minioClient = new Minio.Client({
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT || '9000', 10),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
});

const BUCKET = process.env.MINIO_BUCKET || 'reward-system';

export const s3Service = {
    async ensureBucket(): Promise<void> {
        const exists = await minioClient.bucketExists(BUCKET);
        if (!exists) {
            await minioClient.makeBucket(BUCKET, 'us-east-1');
            logger.info(`MinIO bucket "${BUCKET}" created`);
        }
    },

    async uploadFile(
        buffer: Buffer,
        originalName: string,
        mimeType: string,
        folder = 'uploads'
    ): Promise<string> {
        await this.ensureBucket();

        const ext = originalName.split('.').pop();
        const objectName = `${folder}/${uuidv4()}.${ext}`;

        await minioClient.putObject(BUCKET, objectName, buffer, buffer.length, {
            'Content-Type': mimeType,
        });

        logger.info(`File uploaded to MinIO: ${objectName}`);
        return objectName;
    },

    async getSignedUrl(objectName: string, expirySeconds = 3600): Promise<string> {
        return minioClient.presignedGetObject(BUCKET, objectName, expirySeconds);
    },

    async deleteFile(objectName: string): Promise<void> {
        await minioClient.removeObject(BUCKET, objectName);
        logger.info(`File deleted from MinIO: ${objectName}`);
    },
};
