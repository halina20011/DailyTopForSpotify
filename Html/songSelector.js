import { LookUpList } from "./arrayList.js";

export class SongSelector{
    constructor(parent){
        this.parent = parent;
        this.items = new LookUpList();
    }

    addSelector(songElementInfo, songId, removeButton){
        songElementInfo.button.addEventListener("click", () => {
            songElementInfo.state = !songElementInfo.state;
            if(songElementInfo.state){
                this.add(songId, songElementInfo.element);
            }
            else{
                this.delete(songId);
            }
        });

        removeButton.addEventListener("click", () => {
            if(songElementInfo.state === true){
                songElementInfo.state = false;
                this.delete(songId);
            }
        });
    }

    add(songId, element){
        this.items.push(songId, element);
        this.update();
    }

    delete(songId){
        this.items.pop(songId);
        this.update();
    }

    update(){
        this.parent.innerHTML = "";
        let curr = this.items.head;
        while(curr){
            this.parent.appendChild(curr.val.second);
            curr = curr.next;
        }
        this.items.print();
    }

    selected(){
        const array = [];
        let curr = this.items.head;
        while(curr){
            array.push(curr.val.first);
            curr = curr.next;
        }

        return array;
    }
}
