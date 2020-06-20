using System;
using System.ComponentModel.DataAnnotations;

namespace Todos.Models
{
	public class Todo
	{
		public int Id { get; set; }
		public string Task { get; set; }
		public bool Done { get; set; }

		[DataType(DataType.Date)]
		public DateTime CreatedAt { get; set; }
		[DataType(DataType.Date)]
		public DateTime UpdatedAt { get; set; }
	}
}