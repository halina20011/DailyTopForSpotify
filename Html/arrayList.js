class Node{
    constructor(val, next = null, prev = null){
        this.val = val;
        this.next = next;
        this.prev = prev;
    }
};

class Pair{
    constructor(a, b){
        this.first = a;
        this.second = b;
    }
}

export class LookUpList{
    constructor(){
        this.map = new Map();
        this.size = 0;
        this.head = null;
        this.tail = null;
    }

    clear(){
        this.map.clear();
        this.head = null;
        this.tail = null;
        this.size = 0;
    }

    print(){
        let curr = this.head;
        console.log(`start`);
        while(curr){
            // output.push(curr);
            const prev = (curr.prev) ? curr.prev.val.first : null;
            const next = (curr.next) ? curr.next.val.first : null;
            console.log(`${prev} <= ${JSON.stringify(curr.val.first)} => ${next}`);
            curr = curr.next;
        }
        console.log(`end`);
    }

    push(id, val){
        const pair = new Pair(id, val);
        const newNode = new Node(pair);
        
        newNode.prev = this.tail;

        this.map.set(id, newNode);

        if(!this.head){
            this.head = newNode;
        }
        else{
            this.tail.next = newNode;
        }

        this.tail = newNode;

        this.size++;
    }

    pop(id){
        if(!this.map.has(id)){
            return;
        }

        const curr = this.map.get(id);
        this.map.delete(id);

        if(curr.val == this.head.val){
            this.head = this.head.next;
        }

        if(curr.val == this.tail.val){
            this.tail = this.tail.prev;
        }

        const prev = curr.prev;
        if(prev){
            prev.next = curr.next;
        }
        if(curr.next){
            curr.next.prev = prev;
        }

        this.size--;
    }
}
