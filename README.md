# Trabajo Parcial Computación Gráfica

## Integrantes
- Costa Mondragon, Paulo
- Flores Tenorio, Juan Diego Enrique
- Galindo Alvarez, Franco
- Goyas Ayllon, Leonardo Andre
## Requisitos

- Generar terreno procedural infinito
- Terreno debe contar con una textura distinta por integrante (arena, gras, etc.)
- Debe existir una región dentro de la cual habrán objetos en movimiento
- Los objetos deben tener colisión simple (esférica)

## Implementacion
La base del proyecto se encuentra en la clase Perlin Noise, la cual tiene una matriz (x, y) con alturas. Estas posiciones se guardan, para que al generar nuevas alturas mantenga el contexto de sus vecinos.
Se tiene una libreria de objetos por cada textura, estos bloques se grafican en una cuadricula, y sus alturas son correspondientes a nuestro Perlin Noise. El tipo de objeto que se carga dependera tambien de esta altura. Los niveles segun altura son los siguientes:
- 1: Agua
- 2: Arena
- 3: Tierra
- 4: Piedra

![alt text](https://media.discordapp.net/attachments/971912107459248138/972279886557364284/unknown.png?width=1151&height=559)
