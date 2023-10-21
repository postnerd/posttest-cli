                  _   _            _             _ _
  _ __   ___  ___| |_| |_ ___  ___| |_       ___| (_)
 | '_ \ / _ \/ __| __| __/ _ \/ __| __|____ / __| | |
 | |_) | (_) \__ \ |_| ||  __/\__ \ ||_____| (__| | |
 | .__/ \___/|___/\__|\__\___||___/\__|     \___|_|_|
 |_|

> **⚠ WARNING: This is an alpha version**  
> This app is in early development. Some features may be broken. Use at your own risk.
----------

## Usage

```
git clone <path>
cd posttest-cli
npm install || npm install . -g
```

*Example for global installation:*
```
posttest -e engines.config.example.json -p positions.config.example.json -d -sf´
```

*Example for local installation:*
```
npm start -- -e engines.config.example.json -p positions.config.example.json -d -sf
```

## Options
┌────────┬────────────────────────────────┐
│ option │ description                    │
├────────┼────────────────────────────────┤
│ -e     │ Path to engines config file    │
├────────┼────────────────────────────────┤
│ -p     │ Path to positions config file  │
├────────┼────────────────────────────────┤
│ -d     │ Optional: activate debug mode  │
├────────┼────────────────────────────────┤
│ -sf    │ Optional: add stockfish engine │
└────────┴────────────────────────────────┘

### -p position config file

*Example*
```
[
    {
        "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        "depth": 6
    },
]
```

See the example config file _positions.config.example.json_. All positions are from stockfish internal bench function.

### -e engines config file

*Example*
```
[
    {
        "executable": "/usr/local/bin/node",
        "strings": [
            "./node_modules/stockfish/src/stockfish-nnue-16-no-simd.js"
        ]
    },
    {
        "executable": "postbot",
        "strings": []
    }
]
```

See the example config file _engines.config.example.json_.

### -d debug mode

Shows additional debug informations.

### -sf stockfish

Adds a version of stockfishjs to the performance test without the need to have stockfish added to the engine config file.

