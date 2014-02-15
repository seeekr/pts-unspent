pts-unspent
===========

Installation
============

Install bitcoind (protosharesd).

Install node and npm via your favorite package manager.

Clone this git repo.

Change into repo folder, run npm install, edit bitcoind connection properties in ptsaccounting.js, then execute node ptsaccuonting.js.

The desired output files are created in the folder cache/balance, timestamped with the day of the last included block's time.


About the code
==============
* uses Fibers/fibrous for making things synchronous, which is what we need for this batch-processing work
* only ptsaccounting.js matters really, the rest is mostly for experimentation and learning, will be cleaned up later

TODO
====
* cleanup
* making the resulting balance .json files more easily accessible
* adding proper server & proper web interface
* adding json rpc api for retrieving data programmatically from the service
* reading of "internal" cache files so there's no need to go through the whole blockchain again in order to be able to compute balances for future blocks
