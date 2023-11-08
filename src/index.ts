import { ResponseEsque } from '@trpc/client/dist/internals/types';
import { CloudTasksClient } from '@google-cloud/tasks';
import type { google } from '@google-cloud/tasks/build/protos/protos';

export interface CloudTaskFetcherOptions {
  client: CloudTasksClient;
  queueName: string;
  serviceAccountEmail?: string;
}

export function createCloudTaskFetcher(
  options:
    | CloudTaskFetcherOptions
    | (() => CloudTaskFetcherOptions | Promise<CloudTaskFetcherOptions>),
) {
  return async (
    url: string,
    {
      method,
      body,
      headers,
    }: {
      method?: 'GET' | 'POST' | null | undefined;
      body: WithImplicitCoercion<Uint8Array | ReadonlyArray<number> | string>;
      headers?: Record<string, string>;
    },
  ) => {
    const { client, queueName, serviceAccountEmail } =
      typeof options === 'function' ? await options() : options;

    const task: google.cloud.tasks.v2.ITask = {
      httpRequest: {
        httpMethod: method ?? 'GET',
        url,
        oidcToken: serviceAccountEmail
          ? { serviceAccountEmail, audience: new URL(url).origin }
          : undefined,
        headers: headers as Record<string, string>,
        body: body ? Buffer.from(body).toString('base64') : undefined,
      },
    };

    const [response] = await client.createTask({ parent: queueName, task });
    return {
      json: async () => ({
        result: {
          type: 'data',
          data: { success: true, taskName: response.name },
        },
      }),
    } satisfies ResponseEsque;
  };
}
