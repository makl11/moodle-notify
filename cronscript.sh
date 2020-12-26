#!/bin/sh
NODE_PATH=$(which node)
NTBA_FIX_319=1
sh -c "${NODE_PATH} /app/dist/index.js" >> /var/log/corn_notify.log
