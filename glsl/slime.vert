#version 300 es

in vec4 a_position;
in vec3 a_normal;
in vec2 a_texcoord;
in mat4 a_transform;

out vec3 v_position;
out vec3 v_normal;
out vec2 v_texcoord;

uniform mat4 u_projection;
uniform mat4 u_view;
uniform mat4 u_world;

void main() {

	v_position = (u_world * a_transform * a_position).xyz;
	v_normal = mat3(u_world * a_transform) * a_normal;
	v_texcoord = a_texcoord;

	gl_Position = u_projection * u_view * u_world * a_transform * a_position;
}

