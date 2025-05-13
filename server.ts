// import { S3Client } from 'bun'
import {
  CreateMultipartUploadCommand,
  S3Client,
  // AbortMultipartUploadCommand,
  // CompleteMultipartUploadCommand,
  // CreateMultipartUploadCommand,
  // ListPartsCommand,
  // PutObjectCommand,
  // UploadPartCommand,
} from '@aws-sdk/client-s3'

const config = {
  aws: {
    region: String(process.env.AWS_REGION),
    credentials: {
      accessKeyId: String(process.env.AWS_KEY),
      secretAccessKey: String(process.env.AWS_SECRET),
    },
    bucket: String(process.env.AWS_BUCKET),
    endpoint: String(process.env.AWS_ENDPOINT),
  },
  accessControlAllowOrigin: process.env.ACCESS_CONTROL_ALLOW_ORIGIN || '*',
}

const s3Client = new S3Client({
  region: config.aws.region,
  credentials: config.aws.credentials,
  // endpoint: config.aws.endpoint,
})

function makeUploadPath(filename: string) {
  const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
  const uniqueFilename = `${crypto.randomUUID()}-${safeFilename}`
  return `uploads/${uniqueFilename}`
}

// cors
const corsHeaders = new Headers({
  'Access-Control-Allow-Origin': config.accessControlAllowOrigin,
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Autho',
})

const server = Bun.serve({
  development: {
    // Echo console logs from the browser to the terminal
    console: true,
  },
  routes: {
    // create a presigned URL for uploading a file
    '/s3/multipart': {
      POST: async (req) => {
        // these are set by the uppy dashbaord on the frontend
        const { filename, type, metadata } = await req.json()

        if (typeof filename !== 'string') {
          return Response.json(
            {
              error: 'content filename must be a string',
            },
            { status: 400 },
          )
        }

        const uploadPath = makeUploadPath(filename)

        const command = new CreateMultipartUploadCommand({
          Key: uploadPath,
          Bucket: config.aws.bucket,
          ContentType: type,
          Metadata: metadata,
        })

        const { UploadId } = await s3Client.send(command)

        return Response.json(
          {
            uploadId: UploadId,
            uploadPath: uploadPath,
            bucket: config.aws.bucket,
          },
          {
            headers: corsHeaders,
          },
        )
      },
    },
  },
  fetch(req) {
    // Handle OPTIONS preflight requests
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders, status: 204 })
    }

    // fallback with 404
    return Response.json({ error: 'Not Found' }, { status: 404 })
  },
  error(error) {
    console.error(error)
    return Response.json(
      {
        error: error.message,
      },
      {
        status: 500,
      },
    )
  },
})

console.log(`Server running at http://${server.hostname}:${server.port}`)

export { server }
