import { Command } from 'commander';
import { apiRequest, apiUpload } from './http.js';
import { handle, printResult, readJsonArg } from './output.js';
import { saveConfig, resolveConfig, CONFIG_FILE, DEFAULT_API_URL } from './config.js';

const program = new Command();

program
  .name('replynodes')
  .description('Command-line interface for Replynodes (app.replynodes.com)')
  .version('0.1.0');

// ---------------------------------------------------------------------------
// auth / config
// ---------------------------------------------------------------------------

program
  .command('login <api-key>')
  .description('Save an API key to ~/.config/replynodes-cli/config.json')
  .option('--api-url <url>', 'override the API base URL', DEFAULT_API_URL)
  .action((apiKey: string, opts: { apiUrl: string }) => {
    saveConfig({ apiKey, apiUrl: opts.apiUrl });
    console.log(`Saved credentials to ${CONFIG_FILE}`);
  });

program
  .command('logout')
  .description('Remove the saved API key')
  .action(() => {
    saveConfig({});
    console.log(`Cleared credentials in ${CONFIG_FILE}`);
  });

program
  .command('whoami')
  .description('Show which API URL and key source is active (key is masked)')
  .action(() => {
    const { apiKey, apiUrl } = resolveConfig();
    const masked =
      apiKey.length > 8 ? `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}` : '***';
    printResult({ apiUrl, apiKey: masked });
  });

// ---------------------------------------------------------------------------
// posts
// ---------------------------------------------------------------------------

const posts = program.command('posts').description('Manage posts');

posts
  .command('list')
  .description('List posts in a date range')
  .requiredOption('--start <iso-date>', 'range start (ISO date)')
  .requiredOption('--end <iso-date>', 'range end (ISO date)')
  .option('--customer <id>', 'filter by customer/group id')
  .action((opts) =>
    handle(() =>
      apiRequest('GET', '/posts', {
        query: { startDate: opts.start, endDate: opts.end, customer: opts.customer },
      })
    )
  );

posts
  .command('create')
  .description(
    'Create a post. Simple mode uses --integration/--content; for multi-channel ' +
      'posts, per-provider settings, or media, pass a full CreatePostDto with --json.'
  )
  .option('--integration <id>', 'integration id to post to (repeatable)', (v, prev: string[]) => [...prev, v], [] as string[])
  .option('--content <text>', 'post content (used for every --integration given)')
  .option('--type <type>', 'draft | schedule | now | update', 'draft')
  .option('--date <iso-date-time>', 'schedule date (ISO); required for type=schedule', new Date().toISOString())
  .option('--group <customerId>', 'customer/group id')
  .option('--short-link', 'shorten links in content', false)
  .option('--tag <value:label>', 'tag, repeatable', (v, prev: string[]) => [...prev, v], [] as string[])
  .option('--json <json|@file>', 'full CreatePostDto JSON body, overrides all other flags')
  .action((opts) =>
    handle(() => {
      if (opts.json) {
        return apiRequest('POST', '/posts', { body: readJsonArg(opts.json) });
      }
      if (!opts.integration.length || !opts.content) {
        throw new Error('--integration and --content are required (or pass --json)');
      }
      const tags = opts.tag.map((t: string) => {
        const [value, label] = t.split(':');
        return { value, label: label ?? value };
      });
      const body = {
        type: opts.type,
        date: opts.date,
        shortLink: !!opts.shortLink,
        tags,
        posts: opts.integration.map((id: string) => ({
          integration: { id },
          value: [{ content: opts.content, image: [] }],
          group: opts.group,
        })),
      };
      return apiRequest('POST', '/posts', { body });
    })
  );

posts
  .command('delete <id>')
  .description('Delete a post by id')
  .action((id: string) => handle(() => apiRequest('DELETE', `/posts/${id}`)));

posts
  .command('delete-group <group>')
  .description('Delete all posts in a post group')
  .action((group: string) => handle(() => apiRequest('DELETE', `/posts/group/${group}`)));

posts
  .command('status <id>')
  .description('Change a post status (draft | schedule)')
  .requiredOption('--status <status>', 'draft | schedule')
  .action((id: string, opts) =>
    handle(() => apiRequest('PUT', `/posts/${id}/status`, { body: { status: opts.status } }))
  );

posts
  .command('release-id <id>')
  .description('Set the provider release id on a post')
  .requiredOption('--release-id <releaseId>')
  .action((id: string, opts) =>
    handle(() =>
      apiRequest('PUT', `/posts/${id}/release-id`, { body: { releaseId: opts.releaseId } })
    )
  );

posts
  .command('missing <id>')
  .description('Get missing/incomplete content details for a post')
  .action((id: string) => handle(() => apiRequest('GET', `/posts/${id}/missing`)));

posts
  .command('find-slot <integrationId>')
  .description('Find the next free scheduling slot for an integration')
  .action((integrationId: string) =>
    handle(() => apiRequest('GET', `/find-slot/${integrationId}`))
  );

// ---------------------------------------------------------------------------
// integrations
// ---------------------------------------------------------------------------

const integrations = program.command('integrations').description('Manage connected channels');

integrations
  .command('list')
  .description('List connected integrations/channels')
  .option('--group <id>', 'filter by customer/group id')
  .action((opts) =>
    handle(() => apiRequest('GET', '/integrations', { query: { group: opts.group } }))
  );

integrations
  .command('delete <id>')
  .description('Disconnect an integration')
  .action((id: string) => handle(() => apiRequest('DELETE', `/integrations/${id}`)));

integrations
  .command('auth-url <identifier>')
  .description('Get the OAuth connect URL for a provider (e.g. facebook, x, linkedin)')
  .option('--refresh <integrationId>', 'refresh an existing connection instead of creating a new one')
  .action((identifier: string, opts) =>
    handle(() =>
      apiRequest('GET', `/social/${identifier}`, { query: { refresh: opts.refresh } })
    )
  );

integrations
  .command('settings <id>')
  .description('Get provider settings schema / rules / tools for an integration')
  .action((id: string) => handle(() => apiRequest('GET', `/integration-settings/${id}`)));

integrations
  .command('trigger <id>')
  .description('Call a provider tool method on an integration')
  .requiredOption('--method <methodName>')
  .option('--data <json|@file>', 'method arguments as JSON', '{}')
  .action((id: string, opts) =>
    handle(() =>
      apiRequest('POST', `/integration-trigger/${id}`, {
        body: { methodName: opts.method, data: readJsonArg(opts.data) },
      })
    )
  );

// ---------------------------------------------------------------------------
// groups / notifications / status
// ---------------------------------------------------------------------------

program
  .command('groups')
  .description('List customer/groups')
  .action(() => handle(() => apiRequest('GET', '/groups')));

program
  .command('notifications')
  .description('List notifications')
  .option('--page <n>', 'page number', '0')
  .action((opts) =>
    handle(() => apiRequest('GET', '/notifications', { query: { page: opts.page } }))
  );

program
  .command('status')
  .description('Check whether the API key is connected/valid')
  .action(() => handle(() => apiRequest('GET', '/is-connected')));

// ---------------------------------------------------------------------------
// upload
// ---------------------------------------------------------------------------

const upload = program.command('upload').description('Upload media');

upload
  .command('file <path>')
  .description('Upload a local image/video file')
  .action((path: string) => handle(() => apiUpload('/upload', path)));

upload
  .command('url <url>')
  .description('Upload media by fetching it from a public URL')
  .action((url: string) =>
    handle(() => apiRequest('POST', '/upload-from-url', { body: { url } }))
  );

// ---------------------------------------------------------------------------
// analytics
// ---------------------------------------------------------------------------

const analytics = program.command('analytics').description('Analytics');

analytics
  .command('channel <integrationId>')
  .description('Get analytics for a channel')
  .option('--date <days>', 'lookback window in days', '30')
  .action((integrationId: string, opts) =>
    handle(() =>
      apiRequest('GET', `/analytics/${integrationId}`, { query: { date: opts.date } })
    )
  );

analytics
  .command('post <postId>')
  .description('Get analytics for a specific post')
  .option('--date <days>', 'lookback window in days', '30')
  .action((postId: string, opts) =>
    handle(() =>
      apiRequest('GET', `/analytics/post/${postId}`, { query: { date: opts.date } })
    )
  );

// ---------------------------------------------------------------------------
// video
// ---------------------------------------------------------------------------

const video = program.command('video').description('AI video generation');

video
  .command('generate')
  .description('Generate a video')
  .requiredOption('--type <identifier>', 'video provider identifier')
  .requiredOption('--output <orientation>', 'vertical | horizontal')
  .option('--params <json|@file>', 'custom params for the provider', '{}')
  .action((opts) =>
    handle(() =>
      apiRequest('POST', '/generate-video', {
        body: { type: opts.type, output: opts.output, customParams: readJsonArg(opts.params) },
      })
    )
  );

video
  .command('function')
  .description('Call a video provider function')
  .requiredOption('--identifier <identifier>')
  .requiredOption('--method <functionName>')
  .option('--params <json|@file>', 'function params', '{}')
  .action((opts) =>
    handle(() =>
      apiRequest('POST', '/video/function', {
        body: {
          identifier: opts.identifier,
          functionName: opts.method,
          params: readJsonArg(opts.params),
        },
      })
    )
  );

program.parseAsync(process.argv);
