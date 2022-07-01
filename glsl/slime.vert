#version 300 es

in vec4 a_position;
in vec3 a_normal;
in vec2 a_texcoord;
in vec4 a_color;

out vec4 v_position;
out vec3 v_normal;
out vec2 v_texcoord;
out vec4 v_color;

uniform mat4 u_projection;
uniform mat4 u_view;
uniform mat4 u_world;
uniform vec3 u_viewPosition; // pov position (camera)

void main() {
	vec4 position = u_world * a_position;

	v_position = position;
	v_normal = mat3(u_world) * a_normal;
	v_texcoord = a_texcoord;
	v_color = a_color;

	gl_Position = u_projection * u_view * position;
}

