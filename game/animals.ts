export { type Animal as Type }
export interface Animal {
    readonly emoji: string
    readonly name: string
    readonly facingLeft: boolean
}
export function random(): Animal {
    return list[Math.floor(Math.random() * list.length)]
}
function e(emoji: string, name: string, facingLeft: boolean = false): Animal {
    return { emoji, name, facingLeft }
}
export const list: readonly Animal[] = [
    e("🐶", "Dog"),
    e("🐱", "Cat"),
    e("🐭", "Mouse"),
    e("🐹", "Hamster"),
    e("🐰", "Rabbit"),
    e("🦊", "Fox"),
    e("🐻", "Bear"),
    e("🐼", "Panda"),
    e("🐻‍❄️", "Polar Bear"),
    e("🐨", "Koala"),
    e("🐯", "Tiger"),
    e("🦁", "Lion"),
    e("🐮", "Cow"),
    e("🐷", "Pig"),
    e("🐸", "Frog"),
    e("🐵", "Monkey"),
    e("🙈", "Monkey"),
    e("🙉", "Monkey"),
    e("🙊", "Monkey"),
    e("🐒", "Monkey"),
    e("🦉", "Owl"),
    e("🐺", "Wolf"),
    e("🐗", "Boar", true),
    e("🐴", "Horse", true),
    e("🦄", "Unicorn", true),
    e("🫎", "Hippo", true),
    e("🐝", "Bee", true),
    e("🐛", "Ladybug", true),
    e("🦋", "Butterfly"),
    e("🐌", "Snail", true),
    e("🐞", "Beetle"),
    e("🦂", "Scorpion"),
    e("🐢", "Turtle"),
    e("🐍", "Snake", true),
    e("🦎", "Lizard", true),
    e("🦖", "T-Rex", true),
    e("🦕", "Sauropod", true),
    e("🐙", "Octopus"),
    e("🦑", "Squid"),
    e("🪼", "Jellyfish"),
    e("🦐", "Shrimp", true),
    e("🦞", "Lobster"),
    e("🦀", "Crab"),
    e("🐡", "Clownfish", true),
    e("🐠", "Tropical Fish", true),
    e("🐟", "Fish", true),
    e("🐬", "Dolphin", true),
    e("🐳", "Whale", true),
    e("🐋", "Whale", true),
    e("🦈", "Shark", true),
    e("🦭", "Dolphin", true),
    e("🐊", "Crocodile", true),
    e("🦧", "Orangutan"),
    e("🦔", "Porcupine", true),
    e("🦥", "Sloth", true),
    e("🐿️", "Chipmunk", true),
    e("🦦", "Otter", true),
]
