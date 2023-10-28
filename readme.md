                  _   _            _             _ _
  _ __   ___  ___| |_| |_ ___  ___| |_       ___| (_)
 | '_ \ / _ \/ __| __| __/ _ \/ __| __|____ / __| | |
 | |_) | (_) \__ \ |_| ||  __/\__ \ ||_____| (__| | |
 | .__/ \___/|___/\__|\__\___||___/\__|     \___|_|_|
 |_|

> **⚠ WARNING: This is a beta version**  
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
┌────────┬───────────────────────────────────────────────────────────────────┐
│ option │ description                                                       │
├────────┼───────────────────────────────────────────────────────────────────┤
│ -e     │ Optional: Path to engines config file (default: engines.json)     │
├────────┼───────────────────────────────────────────────────────────────────┤
│ -p     │ Optional: Path to positions config file (default: positions.json) │
├────────┼───────────────────────────────────────────────────────────────────┤
│ -o     │ Optional: Path to output file for storing results                 │
├────────┼───────────────────────────────────────────────────────────────────┤
│ -d     │ Optional: activate debug mode                                     │
├────────┼───────────────────────────────────────────────────────────────────┤
│ -sf    │ Optional: add stockfish engine                                    │
├────────┼───────────────────────────────────────────────────────────────────┤
│ -s     │ Optional: silent mode to just show a progress                     │
└────────┴───────────────────────────────────────────────────────────────────┘

### -p position config file

```
npm start -- -p position.config.example
```

If no -p option is provided posttest will search for a _positions.json_ file at the root of the executaion folder. 

*Format*
```json
[
    {
        "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        "depth": 6
    },
]
```

See the example config file _positions.config.example.json_. All positions are from stockfish's internal bench function.

### -e engines config file

```
npm start -- -e engines.config.example
```

If no -e option is provided posttest will search for a _engines.json_ file at the root of the execution folder. 

*Format*
```json
[
    {
        "executable": "/usr/local/bin/node",
        "strings": [
            "./node_modules/stockfish/src/stockfish-nnue-16-no-simd.js"
        ],
        "advancedComparison": true
    },
    {
        "executable": "postbot",
        "strings": []
    },
    {
        "name": "my lore ipsum",
        "executable": "loreipsum",
        "strings": []
    }
]
```

See the example config file _engines.config.example.json_.

#### Optional: name
You can specify a name for every engine that will be used infavour of the name provided by the uci name parameter.

#### Optional: advancedComparison
If you want to have an advanced comparison table printed and logged at the end of the tests for one or more engines, you can set the _advancedComparison_ flag.

### -s silent mode

```
npm start -- -s
```

Shows just a progress bar. Should be combined with the -o option to log the output to a file.

### -o log output to file

```
npm start -- -o path/to/file.txt
```

Logs the results to the specified path.

### -d debug mode

```
npm start -- -d
```

Shows additional debug informations.

### -sf stockfish

```
npm start -- -sf
```

Adds a version of stockfishjs to the performance test without the need to have stockfish added to the engine config file.