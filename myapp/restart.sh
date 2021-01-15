#!/bin/bash

ff=`lsof -i tcp:3000 | col | awk '{print $2}' | sed -n '2p'`
echo $ff > log
if [[ "$ff" != "" ]]; then
    kill -n 15 $ff
fi