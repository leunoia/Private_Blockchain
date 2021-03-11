

const SHA256 = require('crypto-js/sha256');
const BlockClass = require('./block.js');
const bitcoinMessage = require('bitcoinjs-message');

class Blockchain {

    constructor() {
        this.chain = [];
        this.height = -1;
        this.initializeChain();
    }

    async initializeChain() {
        if( this.height === -1){
            let block = new BlockClass.Block({data: 'Genesis Block'});
            await this._addBlock(block);
        }
    }

    /**
     * Utility method that return a Promise that will resolve with the height of the chain
     */
    getChainHeight() {
        return new Promise((resolve, reject) => {
            const height = this.height
            resolve(height);
        });
    }

    /**
     * @param {*} block 
     */
    _addBlock(block) {
        let self = this;
        return new Promise(async (resolve, reject) => {
            let blockObj = block
            let height = await self.getChainHeight();
            blockObj.time = new Date().getTime().toString().slice(0,-3);
            if (block){
                block.height = parseInt(self.height) + 1;
                if(height >= 0){
                    blockObj.height = height + 1;
                    block.previousBlockHash = self.chain[self.height].hash;
                    block.hash = SHA256(JSON.stringify(block)).toString();
                    self.chain.push(block);
                    self.height = self.chain.length -1;
                    resolve(blockObj);
                }else {
                    blockObj.height = height + 1;
                    blockObj.hash = SHA256(JSON.stringify(blockObj)).toString();
                    self.chain.push(blockObj);
                    self.height = self.chain.length - 1;
                    resolve(blockObj);
                } 
                
            }
        });
    }

    /**
     * @param {*} address 
     */
    requestMessageOwnershipVerification(address) {
        return new Promise(resolve => {
            let message = `${address}:${new Date().getTime().toString().slice(0,-3)}:starRegistry`;
            resolve (message);
        });
    }

    /**
     * @param {*} address 
     * @param {*} message 
     * @param {*} signature 
     * @param {*} star 
     */
    submitStar(address, message, signature, star) {
        let self = this;
        return new Promise(async (resolve, reject) => {
        let time = parseInt(message.split(':')[1]);
        let currentTime = parseInt(new Date().getTime().toString().slice(0, -3));
        if ((time + (5*60*1000)) >= currentTime){
            let isValid = bitcoinMessage.verify(message, address, signature)
            if (isValid){
               const block = new BlockClass.Block({ owner:address, star: star}) 
               const addedBlock = await self._addBlock(block);
               resolve(addedBlock);
            }else {
                reject('Signature is not valid');
            }
        }else{
            reject('Star must be submitted within 5 minutes');
        }   
        });
    }

    /**
     * @param {*} hash 
     */
     getBlockByHash(hash) {
        let self = this;
        return new Promise((resolve, reject) => {
            let block = self.chain.filter(p => p.hash === hash)[0];
            if(block){
                resolve(block);
            } else {
                resolve(null);
            }
        });
    }

   
    /**
    * @param {*} height  
    */ 
   
    getBlockByHeight(height) {
        let self = this;
        return new Promise((resolve, reject) => {
            let block = self.chain.filter(p => p.height === height)[0];
            if(block){
                resolve(block);
            } else {
                resolve(null);
            }
        });
    }

    /**
     * @param {*} address 
     */
    getStarsByWalletAddress (address) {
        let self = this;
        let stars = [];
        return new Promise((resolve, reject) => {
            self.chain.forEach((b) =>{
                let data = b.getBData();
                if (data){
                    if(data.owner === address){
                        stars.push(data);
                    }
                }
            });
            resolve(stars);
        });
    }

    validateChain() {
        let self = this;
        let errorLog = [];
        let chainIndex = 0;
        return new Promise(async (resolve, reject) => {
            let promises = [];
            self.chain.forEach(block => {
                promises.push(block.validateBlock());
                if(block.height > 0){
                    let previousBlockHash = block.previousBlockHash;
                    let prevHashTest = block.chain[chainIndex -1].hash
                    if(prevHashTest !== previousBlockHash){
                        errorLog.push(
                            `Error == Block Height: ${block.height} - Previous Hash does not match`
                        );
                    }
                }
                chainIndex++;
            });
            Promise.all(promises).then((results)=>{
                chainIndex = 0;
                results.forEach(valid => {
                    if(!valid){
                        errorLog.push(`Error - Block Height: ${self.chain[chainIndex].height} has been tampered!`);
                    }
                    chainIndex++;
                })
            })
            resolve(errorLog);
        }).catch((err) => {console.log(err); reject(err)}); 
    }

}

module.exports.Blockchain = Blockchain;   