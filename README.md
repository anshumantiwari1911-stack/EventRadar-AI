# EventRadar AI

Find real hackathons, AI events, coding competitions, and tech meetups in India.
EventRadar searches the web for each query, fetches the original pages, and shows
source links. Event dates, locations, or registration links that cannot be
confirmed from a source are marked as unavailable rather than guessed.

demo: https://event-radar-ai--anshumantiwar25.replit.app/

## Run in Replit

1. Add your TinyFish API key in **Tools → Secrets** as `TINYFISH_API_KEY`.
2. Start the **API Server** and **EventRadar AI** workflows.
3. Open the EventRadar AI preview and search by topic and city.

The API key is only used by the Express API server. It is never sent to the
browser.

## Run from a terminal

Run both commands in separate terminals, with the required service settings:

```sh
PORT=8080 pnpm --filter @workspace/api-server run dev
```

```sh
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/eventradar-ai run dev
```

The web app needs the workflow-provided `PORT` and `BASE_PATH` environment
variables. The API server needs `PORT`. In Replit, the configured workflows set
these automatically.
