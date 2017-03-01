/*
 * Gotta claim them all!
 */

tables = require('tables')

// var target_controller;
reserved = false;
attack = false;
claim = false;
done = false;
spawn = false;
const target = ''

Creep.prototype.claimer_action = function(){
    let table = tables.claim_rooms()[this.memory.spawn]
    let target_ = this.memory.target_room
    let room
    if (target && target_ == target){
        if (this.room.name !== target){
            
            this.moveTo(new RoomPosition(25,25,target))
            // this.move_by_room_path(path)
        } else {
            // check for unreachable conde
            console.log(target_, target, target_ == target)
            if (done){
                return;
            }
            if (!this.pos.isNearTo(target_controller)){
                this.moveTo(target_controller);
            }
            if (attack && this.body_[CLAIM] >= 5){
                this.attackController(target_controller)
            } else if (claim){
                let ret = this.claimController(target_controller);
                if (ret == ERR_GCL_NOT_ENOUGH){
                    this.reserveController(target_controller);
                }
            }
        }
    } else if (target_ === undefined ||
            (Game.rooms[target_] !== undefined
                && Game.rooms[target_].controller.my) ||
            table.indexOf(target_) === -1){
        target_ = table[0]
        room = Game.rooms[target_];
        let i = 0
        //console.log(_.filter(Game.creeps,
        //                c => c.memory.role === 'claimer' && c.memory.target_room == target_))
        while (room && _.sum(Game.creeps,
                            c => c.memory.role === 'claimer' && c.memory.target_room == target_) !== 0 &&
                        i < table.length){
            i+=1;
            target_ = table[i]
            room = Game.rooms[target_];
        }
        if (i == table.length){
            console.log(this.name, 'has nowhere to claim')
            return -1
        } else {
            this.memory.target_room = target_
        }
    } else {
        room = Game.rooms[target_]
    }
    if (this.pos.roomName !== target_){
        this.moveTo(new RoomPosition(25,25,target_));
    } else {
        this.reserveController(Game.rooms[target_].controller);
        this.moveTo(Game.rooms[target_].controller);
    }
    return;
}

module.exports = {
    done: () => done,
    spawn: (name) => name === 'Spawn5' &&
                    Game.creeps[Memory.conqueror] === undefined &&
                    spawn &&
                    !done,
    target: target,

    update: function() {
        index = 0;
        if (Game.rooms[target]){
            target_controller = Game.rooms[target].controller;
            if (target_controller.reservation !== undefined){
                if (target_controller.reservation.username == "rber"){
                    claim = true;
                    attack = false;
                    spawn = true;
                } else if (target_controller.reservation.ticksToEnd < 300) {
                    claim = false;
                    attack = false;
                    spawn = true;
                } else {
                    spawn = false;
                    attack = true;
                }
                done = false
            } else if (target_controller.owner !== undefined){
                if (target_controller.owner.username == "rber"){
                    done = true;
                    attack = false;
                } else {
                    attack = true;
                    done = false
                }
                spawn = false;
                claim = false;
            } else {
                spawn = true;
                attack = false;
                done = false;
                claim = true;
            }
        }
    },

};
