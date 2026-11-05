# Five-tape universal Turing machine — JavaScript

Upload index.html and utm.js into the same directory on your website. No build,
server, dependencies, or network calls are required. You can also open index.html
locally. test.js runs with Node: `node test.js`.

## Input

Use `(Q,Sigma,Gamma,delta,q0,qaccept,qreject),w` or `<(Q,...),w>`.
Each set uses braces. Delta is a set of ordered pairs:
`((source,read),(destination,write,direction))`.
For example `((q0,9),(q1,1,R))` means δ(q0,9)=(q1,1,R).
(9,1,R) alone omits both states and cannot specify a full TM transition.
The included example recognizes binary strings ending in 1.

Names use ASCII letters, digits and underscore. Input symbols are single digits;
tape symbols may have longer names. Blank aliases _, □, ⊔, <blank> normalize to _.
The input may end in blank markers and ...; those represent implicit blank cells,
not input symbols. Use eps for the empty word. All nonhalting state/symbol pairs
must have one transition. Directions L/R only for M. No outgoing halting rules.

## Architecture and formal status

The parser and encoder are input preparation, separate from U. They convert the
human-readable tuple into a fixed-alphabet encoding. U's actual initial tape holds
that encoding of <M,w>, rather than the original punctuation and names. All four
other tapes initially are blank. This distinction is visible in the interface.

The encoded header is ^state|reversed-input$rules#. States other than the two
halting states are indexed by positive unary strings; halting codes are A and R.
Tape symbol codes are positive unary strings; blank is 1. Input symbols are stored
in reverse order as comma-terminated unary blocks so U can initialize a stack.
Rules are source:read:destination:write:direction; .

build() creates the same 247-node finite control graph for every M. Each node tests
one current tape symbol, writes one symbol, moves one head one cell, or transfers
control. These instructions are ordinary multitape transitions with stationary
moves (tests and jumps preserve all symbols and heads). A test's else branch is
finite shorthand for the other symbols in the fixed U alphabet
{_, ^, 1, A, R, |, $, :, ;, ,, #, L, R} (duplicates ignored).
The engine uses only the current graph node and the scanned tape cell.
It does not look up simulated transitions in JavaScript. Runtime memory for the
simulated machine is entirely on five tapes. The graph is downloadable from the UI.

Tape 1: program/input encoding. Tape 2: state. Tape 3: current symbol.
Tape 4: left cells, closest on top. Tape 5: right cells, closest on top.
Stacks preserve arbitrarily many cells; empty right stack pops a simulated blank.
Empty left stack denotes the physical left boundary, where a left move stays.
A simulated step searches the encoded table, compares unary source/read fields,
copies destination/write fields, then pushes/pops the appropriate stacks.

ACCEPT/REJECT are U's halting outcomes. ERROR indicates a control/encoding failure,
not rejection. Limits and pause are host controls and do not decide nontermination.
Finite real computers impose memory limits, as for any software TM implementation.

## API

const u = new UTMLab.UTM(text);
u.step();              // one primitive U transition
u.run(100000);         // ACCEPT, REJECT, ERROR, or INCONCLUSIVE
u.window(0);           // display window around Tape 1's head
UTMLab.CONTROL;        // fixed finite control graph

Browser global UTMLab; CommonJS exports are available for Node.

## Verification

Node tests cover generated valid machines, accepting/rejecting examples, the empty
word, a looping machine, missing transitions, and control-graph references.
The web controls have not been verified in a live browser in this environment.
