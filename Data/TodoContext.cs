using Microsoft.EntityFrameworkCore;
using Todos.Models;

namespace Todos.Data
{
	public class TodoContext : DbContext
	{
		public TodoContext(DbContextOptions<TodoContext> options) : base(options) { }

		public DbSet<Todo> Todo { get; set; }
	}
}