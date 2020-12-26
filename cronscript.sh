#!/bin/sh
NODE_PATH=$(which node)
NTBA_FIX_319=1
sh -c "${NODE_PATH} /home/node/app/index.js" >> /var/log/corn_notify.log