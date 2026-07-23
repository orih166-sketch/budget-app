#!/bin/bash
cd "$(dirname "$0")"
export VERCEL_TOKEN=vcp_4iYUYurOaFUWcuulE6qTO9vkJSACyr99SUvMWuhNEBM7Y2VlEv0WqijV
npx vercel --prod --yes
