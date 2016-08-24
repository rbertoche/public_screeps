/*
 * creep helper code
 */

Creep.prototype.has = function (part){
    let ret;
    if (this.memory.has === undefined){
        this.memory.has = {};
    }
    if (this.memory.has[part] === undefined){
        ret = this.body.filter(p => p.type === part).length;
        this.memory.has[part] = ret;
    } else {
        ret = this.memory.has[part];
    }
    return ret;
}

