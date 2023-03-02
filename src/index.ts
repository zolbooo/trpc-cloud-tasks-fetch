import { google } from '@google-cloud/tasks/build/protos/protos';
import { Headers } from 'node-fetch';
import { CloudTasksClient } from '@google-cloud/tasks';
import { FetchEsque, ResponseEsque } from '@trpc/client/dist/internals/types';

export interface CloudTaskFetcherOptions {
  client: CloudTasksClient;
  queueName: string;
  serviceAccountEmail?: string;
}

export function createCloudTaskFetcher(
  options:
    | CloudTaskFetcherOptions
    | (() => CloudTaskFetcherOptions | Promise<CloudTaskFetcherOptions>),
): FetchEsque {
  return async (url, { method, body, headers }) => {
    const { client, queueName, serviceAccountEmail } =
      typeof options === 'function' ? await options() : options;

    const task: google.cloud.tasks.v2.ITask = {
      httpRequest: {
        httpMethod: method,
        url,
        oidcToken: serviceAccountEmail
          ? { serviceAccountEmail, audience: new URL(url).origin }
          : undefined,
        headers,
        body: body ? Buffer.from(body).toString('base64') : undefined,
      },
    };

    const [response] = await client.createTask({ parent: queueName, task });
    return {
      headers: new Headers(),
      ok: true,
      redirected: true,
      status: 201,
      statusText: 'Created',
      type: 'basic',
      url,
      json: async () => ({
        result: {
          type: 'data',
          data: { success: true, taskName: response.name },
        },
      }),
      clone() {
        return this;
      },
    } satisfies ResponseEsque;
  };
}
