# Page View Events

A simple user tracking script.

### Installation

```html
// load the script
<script src="PageViewEvents.js"></script>

// set config
<script>
    const pveConfig = {
        // Options for sending data
        sendOptions: {
            sendMethod: "fetch",
            sendJson: true,
            sendUrl: "https://example.com/log",
        },

        // Options for initialization
        initOptions: {
            tid: "example-site",
            lu: false,
            luid: "abc",
            cid: "123",
            ip: "127.0.0.1"
        }
    };
</script>
```

### Custom events

By default, only "full page load" and "on click" events are logged, but you can define your own events in your code:

```js
pve.event(null, 'custom event type name');

pve.event(e.target, 'another custom event type name');
```