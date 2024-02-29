class Node{
    constructor(val, next = null){
        this.val = val;
        this.next = next;
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

    print(){
        const output = [];
        let curr = this.head;
        while(curr){
            output.push(curr);
            curr = curr.next;
        }
        console.log(JSON.stringify(output));
    }

    push(id, val){
        const pair = new Pair(id, val);
        const newNode = new Node(pair);
        
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

        let curr = this.map.get(id);
        if(curr.val == this.head.val){
            this.head = null;
            this.tail = null;
        }
        this.map.delete(id);
        curr = curr.next;
        this.size--;
    }
}
